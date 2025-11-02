// src/lib/document-storage/document-storage-service.ts
// Lightweight IndexedDB + Blob storage for draft PDF documents
// FIXED: All buffer operations now properly clone to prevent detachment

import { openDB, DBSchema, IDBPDatabase } from 'idb';
// (Tauri FS APIs are loaded lazily inside methods)

// ==================== Types ====================

interface DraftDocument {
  id: string; // documentId
  pdfBlob: Blob;
  version: number;
  fieldValues: Record<string, any>;
  lastModified: number;
  createdAt: number;
  status: 'draft' | 'finalizing' | 'finalized';
  size: number;
  checksum?: string;
}

interface DraftVersion {
  id: string; // `${documentId}_v${version}`
  documentId: string;
  version: number;
  pdfBlob: Blob;
  fieldValues: Record<string, any>;
  createdAt: number;
  size: number;
}

interface FieldChangeLog {
  id: string; // Auto-generated
  documentId: string;
  fieldName: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
}

interface StorageMetadata {
  id: string;
  totalSize: number;
  draftCount: number;
  lastCleanup: number;
}

// ==================== Database Schema ====================

interface DocumentStorageDB extends DBSchema {
  drafts: {
    key: string;
    value: DraftDocument;
    indexes: { 'by-status': string; 'by-modified': number };
  };
  versions: {
    key: string;
    value: DraftVersion;
    indexes: { 'by-document': string; 'by-created': number };
  };
  changeLog: {
    key: string;
    value: FieldChangeLog;
    indexes: { 'by-document': string; 'by-timestamp': number };
  };
  metadata: {
    key: string;
    value: StorageMetadata;
  };
}

// ==================== Configuration ====================

const DB_NAME = 'DealerDocuments';
const DB_VERSION = 1;
const MAX_VERSIONS_PER_DOCUMENT = 5;
const MAX_CHANGE_LOG_ENTRIES = 100;
const CLEANUP_THRESHOLD_DAYS = 30;
const MAX_STORAGE_SIZE_MB = 100; // Soft limit

// ==================== Memory Cache ====================

class MemoryCache {
  private cache = new Map<string, ArrayBuffer>();
  private maxSize = 50 * 1024 * 1024; // 50MB max in memory
  private currentSize = 0;

  set(key: string, buffer: ArrayBuffer): void {
    // Always clone when storing
    const cloned = buffer.slice(0);
    const size = cloned.byteLength;
    
    // Evict if needed
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      const firstKey = this.cache.keys().next().value;
      if(firstKey) {
        this.evict(firstKey);
      }
    }

    this.cache.set(key, cloned);
    this.currentSize += size;
  }

  get(key: string): ArrayBuffer | undefined {
    const buffer = this.cache.get(key);
    // Always return a clone
    return buffer ? buffer.slice(0) : undefined;
  }

  evict(key: string): void {
    const buffer = this.cache.get(key);
    if (buffer) {
      this.currentSize -= buffer.byteLength;
      this.cache.delete(key);
    }
  }

  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  getSize(): number {
    return this.currentSize;
  }
}

// ==================== Main Service ====================

class DocumentStorageService {
  private db: IDBPDatabase<DocumentStorageDB> | null = null;
  private cache = new MemoryCache();
  private initialized = false;
  private fsInitialized = false;
  private dirs: { root: string; documents: string; blobs: string; cache: string } | null = null;

  // ==================== Initialization ====================

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.db = await openDB<DocumentStorageDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Drafts store
        if (!db.objectStoreNames.contains('drafts')) {
          const draftStore = db.createObjectStore('drafts', { keyPath: 'id' });
          draftStore.createIndex('by-status', 'status');
          draftStore.createIndex('by-modified', 'lastModified');
        }

        // Versions store
        if (!db.objectStoreNames.contains('versions')) {
          const versionStore = db.createObjectStore('versions', { keyPath: 'id' });
          versionStore.createIndex('by-document', 'documentId');
          versionStore.createIndex('by-created', 'createdAt');
        }

        // Change log store
        if (!db.objectStoreNames.contains('changeLog')) {
          const logStore = db.createObjectStore('changeLog', { 
            keyPath: 'id',
            autoIncrement: true 
          });
          logStore.createIndex('by-document', 'documentId');
          logStore.createIndex('by-timestamp', 'timestamp');
        }

        // Metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'id' });
        }
      },
    });

    this.initialized = true;
    console.log('📦 Document storage initialized');

    // Also ensure filesystem directories exist
    await this.ensureFsDirs();

    // Run cleanup on startup
    await this.cleanupOldDrafts();
  }

  private async ensureFsDirs(): Promise<void> {
    if (this.fsInitialized) return;
    try {
      const { mkdir, exists, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      const envRoot = (import.meta as any)?.env?.VITE_UAB_DEV_DOCS_DIR as string | undefined;
  
      let root: string;
      let documents: string;
      let blobs: string;
      let cache: string;
  
      if (envRoot && envRoot.startsWith('/')) {
        // Absolute override (development) - no BaseDirectory needed
        root = envRoot.replace(/\/$/, '');
        documents = `${root}/documents`;
        blobs = `${root}/blobs`;
        cache = `${root}/cache`;
  
        if (!(await exists(root))) await mkdir(root, { recursive: true });
        if (!(await exists(documents))) await mkdir(documents, { recursive: true });
        if (!(await exists(blobs))) await mkdir(blobs, { recursive: true });
        if (!(await exists(cache))) await mkdir(cache, { recursive: true });
      } else {
        // Production: Use AppData with BaseDirectory
        root = 'uab';
        documents = 'uab/documents';
        blobs = 'uab/blobs';
        cache = 'uab/cache';
  
        if (!(await exists(root, { baseDir: BaseDirectory.AppData }))) {
          await mkdir(root, { baseDir: BaseDirectory.AppData, recursive: true });
        }
        if (!(await exists(documents, { baseDir: BaseDirectory.AppData }))) {
          await mkdir(documents, { baseDir: BaseDirectory.AppData, recursive: true });
        }
        if (!(await exists(blobs, { baseDir: BaseDirectory.AppData }))) {
          await mkdir(blobs, { baseDir: BaseDirectory.AppData, recursive: true });
        }
        if (!(await exists(cache, { baseDir: BaseDirectory.AppData }))) {
          await mkdir(cache, { baseDir: BaseDirectory.AppData, recursive: true });
        }
      }
  
      this.dirs = { root, documents, blobs, cache };
      this.fsInitialized = true;
      console.log(`📁 FS ready at ${root.startsWith('/') ? root : `AppData/${root}`} (documents, blobs, cache)`);
    } catch (e) {
      console.warn('⚠️ Failed to initialize filesystem storage, continuing with IndexedDB only:', e);
    }
  }

  // ==================== Draft Management ====================

  /**
   * Save draft PDF with field values
   */
  async saveDraft(
    documentId: string,
    pdfBuffer: ArrayBuffer,
    fieldValues: Record<string, any>
  ): Promise<void> {
    await this.ensureInitialized();
    await this.ensureFsDirs();
  
    // CRITICAL: Clone the buffer immediately to prevent detachment
    const clonedBuffer = pdfBuffer.slice(0);
    
    const blob = new Blob([clonedBuffer], { type: 'application/pdf' });
    const now = Date.now();
  
    // Get existing draft if any
    const existingDraft = await this.db!.get('drafts', documentId);
    const version = existingDraft ? existingDraft.version + 1 : 1;
  
    // Save as new version (keep last 5 versions)
    if (existingDraft && version <= MAX_VERSIONS_PER_DOCUMENT) {
      await this.saveVersion(documentId, existingDraft);
    }
  
    // Update main draft
    const draft: DraftDocument = {
      id: documentId,
      pdfBlob: blob,
      version,
      fieldValues,
      lastModified: now,
      createdAt: existingDraft?.createdAt || now,
      status: 'draft',
      size: blob.size,
    };
  
    await this.db!.put('drafts', draft);
  
    // Update cache with CLONED buffer
    this.cache.set(documentId, clonedBuffer);
  
    // Write to disk (blobs) for durability - use cloned buffer
    try {
      if (this.dirs) {
        const { writeFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
        const path = `${this.dirs.blobs}/${documentId}.pdf`;
        // Clone again for file write to be safe
        const fileBuffer = clonedBuffer.slice(0);
        if (this.dirs.blobs.startsWith('/')) {
          await writeFile(path, new Uint8Array(fileBuffer));
          console.log(`💾 Saved draft blob to FS://${path}`);
        } else {
          await writeFile(path, new Uint8Array(fileBuffer), { baseDir: BaseDirectory.AppData });
          console.log(`💾 Saved draft blob to FS://AppData/${path}`);
        }
      }
    } catch (e) {
      console.warn('⚠️ Failed writing draft to disk:', e);
    }
  
    // Log field changes
    if (existingDraft) {
      await this.logFieldChanges(documentId, existingDraft.fieldValues, fieldValues);
    }
  
    // Update metadata
    await this.updateMetadata();
  
    // Enforce soft storage limit
    await this.enforceStorageLimit();
  
    console.log(
      `💾 Saved draft: ${documentId} v${version} (${(blob.size / 1024).toFixed(2)} KB) @ IndexedDB://${DB_NAME}/drafts/${documentId}`
    );
  }

  /**
   * Load draft PDF
   */
  async loadDraft(documentId: string): Promise<ArrayBuffer | null> {
    await this.ensureInitialized();
    await this.ensureFsDirs();
  
    // Check cache first - cache.get() already returns a clone
    const cached = this.cache.get(documentId);
    if (cached && cached.byteLength > 0) {
      console.log(`⚡ Loaded from cache: ${documentId} (${cached.byteLength} bytes)`);
      return cached; // Already cloned by cache.get()
    }
  
    // If cache was empty, evict it
    if (cached && cached.byteLength === 0) {
      console.warn('⚠️ Empty buffer in cache, evicting');
      this.cache.evict(documentId);
    }
  
    // Load from IndexedDB
    const draft = await this.db!.get('drafts', documentId);
    if (!draft) {
      // Fallback to disk (blobs or documents)
      try {
        if (this.dirs) {
          const { readFile, exists, BaseDirectory } = await import('@tauri-apps/plugin-fs');
          const tryRead = async (p: string): Promise<ArrayBuffer | null> => {
            try {
              let bin: Uint8Array;
              if (p.startsWith('/')) {
                if (await exists(p)) {
                  bin = await readFile(p) as Uint8Array;
                } else {
                  return null;
                }
              } else {
                if (await exists(p, { baseDir: BaseDirectory.AppData })) {
                  bin = await readFile(p, { baseDir: BaseDirectory.AppData }) as Uint8Array;
                } else {
                  return null;
                }
              }
              
              // Create a fresh ArrayBuffer from the Uint8Array
              const buffer = new ArrayBuffer(bin.length);
              const view = new Uint8Array(buffer);
              view.set(bin);
              
              if (buffer.byteLength > 0) {
                return buffer;
              }
            } catch (err) {
              console.warn(`Failed to read ${p}:`, err);
              return null;
            }
            return null;
          };
  
          const blobPath = `${this.dirs.blobs}/${documentId}.pdf`;
          const blobBuf = await tryRead(blobPath);
          if (blobBuf) {
            this.cache.set(documentId, blobBuf); // Cache it (cache.set clones)
            console.log(`📂 Loaded from FS blob: ${this.dirs.blobs.startsWith('/') ? '' : 'AppData/'}${blobPath} (${blobBuf.byteLength} bytes)`);
            return blobBuf.slice(0); // Return a fresh clone
          }
  
          const docPath = `${this.dirs.documents}/${documentId}.pdf`;
          const docBuf = await tryRead(docPath);
          if (docBuf) {
            this.cache.set(documentId, docBuf); // Cache it (cache.set clones)
            console.log(`📂 Loaded from FS document: ${this.dirs.documents.startsWith('/') ? '' : 'AppData/'}${docPath} (${docBuf.byteLength} bytes)`);
            return docBuf.slice(0); // Return a fresh clone
          }
        }
      } catch (e) {
        console.warn('⚠️ Failed reading draft from disk:', e);
      }
      return null;
    }
  
    const buffer = await draft.pdfBlob.arrayBuffer();
    
    // Validate buffer before caching
    if (buffer.byteLength === 0) {
      console.warn('⚠️ Draft blob in IndexedDB is empty');
      return null;
    }
    
    // Store in cache (cache.set clones)
    this.cache.set(documentId, buffer);
  
    console.log(
      `📂 Loaded from IndexedDB: ${documentId} v${draft.version} (${buffer.byteLength} bytes) @ IndexedDB://${DB_NAME}/drafts/${documentId}`
    );
    
    // Return a fresh clone
    return buffer.slice(0);
  }

  /**
   * Get draft metadata (without loading blob)
   */
  async getDraftMetadata(documentId: string): Promise<Omit<DraftDocument, 'pdfBlob'> | null> {
    await this.ensureInitialized();

    const draft = await this.db!.get('drafts', documentId);
    if (!draft) return null;

    const { pdfBlob, ...metadata } = draft;
    return metadata;
  }

  /**
   * Check if draft exists
   */
  async hasDraft(documentId: string): Promise<boolean> {
    await this.ensureInitialized();
    const draft = await this.db!.get('drafts', documentId);
    return !!draft;
  }

  // ==================== Field Values Management ====================

  /**
   * Update field values without regenerating PDF
   * Useful for tracking changes before saving
   */
  async updateFieldValues(
    documentId: string,
    fieldValues: Record<string, any>
  ): Promise<void> {
    await this.ensureInitialized();

    const draft = await this.db!.get('drafts', documentId);
    if (!draft) {
      throw new Error(`Draft not found: ${documentId}`);
    }

    // Log changes
    await this.logFieldChanges(documentId, draft.fieldValues, fieldValues);

    // Update field values
    draft.fieldValues = fieldValues;
    draft.lastModified = Date.now();

    await this.db!.put('drafts', draft);
  }

  /**
   * Get current field values
   */
  async getFieldValues(documentId: string): Promise<Record<string, any> | null> {
    await this.ensureInitialized();

    const draft = await this.db!.get('drafts', documentId);
    return draft?.fieldValues || null;
  }

  // ==================== Version History ====================

  /**
   * Save a version to history
   */
  private async saveVersion(documentId: string, draft: DraftDocument): Promise<void> {
    const versionId = `${documentId}_v${draft.version}`;
    
    const version: DraftVersion = {
      id: versionId,
      documentId,
      version: draft.version,
      pdfBlob: draft.pdfBlob,
      fieldValues: draft.fieldValues,
      createdAt: draft.lastModified,
      size: draft.size,
    };

    await this.db!.put('versions', version);

    // Keep only last N versions
    await this.trimVersionHistory(documentId);

    console.log(
      `🗂️ Saved version: ${versionId} (${(draft.size / 1024).toFixed(2)} KB) @ IndexedDB://${DB_NAME}/versions/${versionId}`
    );
  }

  /**
   * Get version history for a document
   */
  async getVersionHistory(documentId: string): Promise<Omit<DraftVersion, 'pdfBlob'>[]> {
    await this.ensureInitialized();

    const versions = await this.db!.getAllFromIndex('versions', 'by-document', documentId);
    
    return versions
      .sort((a, b) => b.version - a.version)
      .map(({ pdfBlob, ...metadata }) => metadata);
  }

  /**
   * Load a specific version
   */
  async loadVersion(documentId: string, version: number): Promise<ArrayBuffer | null> {
    await this.ensureInitialized();

    const versionId = `${documentId}_v${version}`;
    const versionData = await this.db!.get('versions', versionId);
    
    if (!versionData) return null;

    const arr = await versionData.pdfBlob.arrayBuffer();
    console.log(
      `📜 Loaded version: ${versionId} (${(versionData.size / 1024).toFixed(2)} KB) @ IndexedDB://${DB_NAME}/versions/${versionId}`
    );
    // Return a clone
    return arr.slice(0);
  }

  /**
   * Trim version history to keep only last N versions
   */
  private async trimVersionHistory(documentId: string): Promise<void> {
    const versions = await this.db!.getAllFromIndex('versions', 'by-document', documentId);
    
    if (versions.length <= MAX_VERSIONS_PER_DOCUMENT) return;

    // Sort by version descending
    const sorted = versions.sort((a, b) => b.version - a.version);
    
    // Delete oldest versions
    const toDelete = sorted.slice(MAX_VERSIONS_PER_DOCUMENT);
    for (const version of toDelete) {
      await this.db!.delete('versions', version.id);
    }

    console.log(`🗑️ Trimmed ${toDelete.length} old versions for ${documentId}`);
  }

  // ==================== Change Log ====================

  /**
   * Log field changes
   */
  private async logFieldChanges(
    documentId: string,
    oldValues: Record<string, any>,
    newValues: Record<string, any>
  ): Promise<void> {
    const changes: FieldChangeLog[] = [];
    const now = Date.now();

    for (const [fieldName, newValue] of Object.entries(newValues)) {
      const oldValue = oldValues[fieldName];
      
      if (oldValue !== newValue) {
        changes.push({
          id: `${documentId}_${fieldName}_${now}`,
          documentId,
          fieldName,
          oldValue,
          newValue,
          timestamp: now,
        });
      }
    }

    // Save changes
    for (const change of changes) {
      await this.db!.put('changeLog', change);
    }

    // Trim log if too large
    await this.trimChangeLog(documentId);
  }

  /**
   * Get change history for a document
   */
  async getChangeHistory(documentId: string, limit = 50): Promise<FieldChangeLog[]> {
    await this.ensureInitialized();

    const changes = await this.db!.getAllFromIndex('changeLog', 'by-document', documentId);
    
    return changes
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Trim change log
   */
  private async trimChangeLog(documentId: string): Promise<void> {
    const changes = await this.db!.getAllFromIndex('changeLog', 'by-document', documentId);
    
    if (changes.length <= MAX_CHANGE_LOG_ENTRIES) return;

    // Sort by timestamp descending
    const sorted = changes.sort((a, b) => b.timestamp - a.timestamp);
    
    // Delete oldest entries
    const toDelete = sorted.slice(MAX_CHANGE_LOG_ENTRIES);
    for (const change of toDelete) {
      await this.db!.delete('changeLog', change.id);
    }
  }

  // ==================== Finalization ====================

  /**
   * Mark draft as finalizing (preparing for S3 upload)
   */
  async markFinalizing(documentId: string): Promise<void> {
    await this.ensureInitialized();

    const draft = await this.db!.get('drafts', documentId);
    if (!draft) {
      throw new Error(`Draft not found: ${documentId}`);
    }

    draft.status = 'finalizing';
    draft.lastModified = Date.now();

    await this.db!.put('drafts', draft);
  }

  /**
   * Mark draft as finalized and cleanup
   */
  async markFinalized(documentId: string): Promise<void> {
    await this.ensureInitialized();
    await this.ensureFsDirs();

    const draft = await this.db!.get('drafts', documentId);
    if (!draft) {
      throw new Error(`Draft not found: ${documentId}`);
    }

    draft.status = 'finalized';
    draft.lastModified = Date.now();

    await this.db!.put('drafts', draft);

    // Clear from cache
    this.cache.evict(documentId);

    console.log(
      `✅ Marked as finalized: ${documentId} @ IndexedDB://${DB_NAME}/drafts/${documentId}`
    );

    // Persist a copy to the documents folder
    try {
      if (this.dirs) {
        const { writeFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
        const pdfArr = await draft.pdfBlob.arrayBuffer();
        const path = `${this.dirs.documents}/${documentId}.pdf`;
        if (this.dirs.documents.startsWith('/')) {
          await writeFile(path, new Uint8Array(pdfArr));
          console.log(`📄 Finalized PDF saved to FS://${path}`);
        } else {
          await writeFile(path, new Uint8Array(pdfArr), { baseDir: BaseDirectory.AppData });
          console.log(`📄 Finalized PDF saved to FS://AppData/${path}`);
        }
      }
    } catch (e) {
      console.warn('⚠️ Failed writing finalized PDF to disk:', e);
    }

    // Recalculate metadata and enforce storage soft limit after finalization
    await this.updateMetadata();
    await this.enforceStorageLimit();
  }

  /**
   * Delete draft and all related data
   */
  async deleteDraft(documentId: string): Promise<void> {
    await this.ensureInitialized();
    await this.ensureFsDirs();

    // Delete draft
    await this.db!.delete('drafts', documentId);

    // Delete versions
    const versions = await this.db!.getAllFromIndex('versions', 'by-document', documentId);
    for (const version of versions) {
      await this.db!.delete('versions', version.id);
    }

    // Delete change log
    const changes = await this.db!.getAllFromIndex('changeLog', 'by-document', documentId);
    for (const change of changes) {
      await this.db!.delete('changeLog', change.id);
    }

    // Clear from cache
    this.cache.evict(documentId);

    await this.updateMetadata();

    console.log(
      `🗑️ Deleted draft: ${documentId} (and related versions/changeLog) from IndexedDB://${DB_NAME}`
    );
  }

  // ==================== Cleanup ====================

  /**
   * Cleanup old drafts
   */
  async cleanupOldDrafts(daysOld = CLEANUP_THRESHOLD_DAYS): Promise<number> {
    await this.ensureInitialized();

    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const allDrafts = await this.db!.getAll('drafts');

    let deletedCount = 0;

    for (const draft of allDrafts) {
      // Only cleanup finalized drafts older than threshold
      if (draft.status === 'finalized' && draft.lastModified < cutoffTime) {
        await this.deleteDraft(draft.id);
        deletedCount++;
      }
    }

    console.log(`🧹 Cleaned up ${deletedCount} old drafts`);
    
    // Update metadata
    await this.updateStorageMetadata('lastCleanup', Date.now());

    return deletedCount;
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalSize: number;
    draftCount: number;
    versionCount: number;
    cacheSize: number;
    lastCleanup: number;
  }> {
    await this.ensureInitialized();

    const drafts = await this.db!.getAll('drafts');
    const versions = await this.db!.getAll('versions');
    
    const totalSize = drafts.reduce((sum, d) => sum + d.size, 0) +
                      versions.reduce((sum, v) => sum + v.size, 0);

    const metadata = await this.db!.get('metadata', 'storage');

    return {
      totalSize,
      draftCount: drafts.length,
      versionCount: versions.length,
      cacheSize: this.cache.getSize(),
      lastCleanup: metadata?.lastCleanup || 0,
    };
  }

  // ==================== Metadata Management ====================

  /**
   * Update storage metadata
   */
  private async updateMetadata(): Promise<void> {
    const stats = await this.getStorageStats();

    const metadata: StorageMetadata = {
      id: 'storage',
      totalSize: stats.totalSize,
      draftCount: stats.draftCount,
      lastCleanup: stats.lastCleanup,
    };

    await this.db!.put('metadata', metadata);
  }

  /**
   * Update specific metadata field
   */
  private async updateStorageMetadata(key: keyof StorageMetadata, value: any): Promise<void> {
    let metadata = await this.db!.get('metadata', 'storage');
    
    if (!metadata) {
      metadata = {
        id: 'storage',
        totalSize: 0,
        draftCount: 0,
        lastCleanup: 0,
      };
    }

    (metadata as any)[key] = value;
    await this.db!.put('metadata', metadata);
  }

  // ==================== Utility ====================

  /**
   * List all drafts
   */
  async listAllDrafts(): Promise<Omit<DraftDocument, 'pdfBlob'>[]> {
    await this.ensureInitialized();

    const drafts = await this.db!.getAll('drafts');
    
    return drafts.map(({ pdfBlob, ...metadata }) => metadata);
  }

  /**
   * Clear all data (use with caution!)
   */
  async clearAll(): Promise<void> {
    await this.ensureInitialized();

    await this.db!.clear('drafts');
    await this.db!.clear('versions');
    await this.db!.clear('changeLog');
    await this.db!.clear('metadata');
    
    this.cache.clear();

    console.log('🗑️ Cleared all storage data');
  }

  /**
   * Ensure service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Enforce soft storage size limit by pruning oldest finalized drafts first,
   * then oldest versions, until total size is below limit. Active drafts are preserved.
   */
  private async enforceStorageLimit(): Promise<void> {
    const limitBytes = MAX_STORAGE_SIZE_MB * 1024 * 1024;
    const stats = await this.getStorageStats();

    if (stats.totalSize <= limitBytes) return;

    // 1) Remove oldest finalized drafts first
    const allDrafts = await this.db!.getAll('drafts');
    const finalizedDrafts = allDrafts
      .filter((d) => d.status === 'finalized')
      .sort((a, b) => a.lastModified - b.lastModified);

    for (const draft of finalizedDrafts) {
      if (stats.totalSize <= limitBytes) break;
      await this.deleteDraft(draft.id);
      // update running total without recomputing everything expensively
      stats.totalSize -= draft.size;
    }

    if (stats.totalSize <= limitBytes) return;

    // 2) Remove oldest versions next
    const allVersions = await this.db!.getAll('versions');
    const sortedVersions = allVersions.sort((a, b) => a.createdAt - b.createdAt);

    for (const version of sortedVersions) {
      if (stats.totalSize <= limitBytes) break;
      await this.db!.delete('versions', version.id);
      stats.totalSize -= version.size;
    }

    // Update metadata after pruning
    await this.updateMetadata();
  }
}

// ==================== Export Singleton ====================

export const documentStorage = new DocumentStorageService();

// ==================== Export Types ====================

export type {
  DraftDocument,
  DraftVersion,
  FieldChangeLog,
  StorageMetadata,
};