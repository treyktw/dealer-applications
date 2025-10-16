"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAction, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Upload,
  FileText,
  Trash2,
  Download,
  Loader2,
  CheckCircle,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface CustomDocument {
  _id: Id<"dealer_uploaded_documents">;
  documentName: string;
  documentType: string;
  fileSize: number;
  mimeType: string;
  createdAt: number;
  uploadedBy: string;
}

interface CustomDocumentUploadProps {
  dealId: Id<"deals">;
  onUploadComplete?: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'contract', label: 'Contract' },
  { value: 'agreement', label: 'Agreement' },
  { value: 'form', label: 'Form' },
  { value: 'addendum', label: 'Addendum' },
  { value: 'disclosure', label: 'Disclosure' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'other', label: 'Other' },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
];

export function CustomDocumentUpload({ dealId, onUploadComplete }: CustomDocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [documentTypes, setDocumentTypes] = useState<Record<string, string>>({});
  const [uploadedDocuments, setUploadedDocuments] = useState<CustomDocument[]>([]);

  const generateUploadUrl = useAction(api.documents.generateCustomDocumentUploadUrl);
  const generateDownloadUrl = useAction(api.documents.generateCustomDocumentDownloadUrl);
  const deleteDocument = useMutation(api.documents.deleteCustomDocument);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast.error(`File ${file.name} has an unsupported format.`);
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
    
    // Set default document type for new files
    const newTypes = { ...documentTypes };
    validFiles.forEach(file => {
      const fileKey = `${file.name}-${file.size}`;
      if (!newTypes[fileKey]) {
        newTypes[fileKey] = 'contract'; // default
      }
    });
    setDocumentTypes(newTypes);
  }, [documentTypes]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    multiple: true,
  });

  const removeFile = (fileIndex: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== fileIndex));
  };

  const updateDocumentType = (fileIndex: number, type: string) => {
    const file = selectedFiles[fileIndex];
    if (!file) return;

    const fileKey = `${file.name}-${file.size}`;
    setDocumentTypes(prev => ({
      ...prev,
      [fileKey]: type,
    }));
  };

  const uploadFile = async (file: File, documentType: string) => {
    try {
      const result = await generateUploadUrl({
        dealId,
        fileName: file.name,
        fileType: documentType,
        mimeType: file.type,
      });

      const response = await fetch(result.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      // Update file size after successful upload
      await fetch('/api/update-document-size', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: result.documentId,
          fileSize: file.size,
        }),
      });

      return result.documentId;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadPromises = selectedFiles.map(async (file, index) => {
        const fileKey = `${file.name}-${file.size}`;
        const documentType = documentTypes[fileKey] || 'contract';

        const documentId = await uploadFile(file, documentType);
        
        setUploadProgress((index + 1) / selectedFiles.length * 100);
        
        return {
          _id: documentId as Id<"dealer_uploaded_documents">,
          documentName: file.name,
          documentType,
          fileSize: file.size,
          mimeType: file.type,
          createdAt: Date.now(),
          uploadedBy: 'current-user', // This should be the actual user ID
        };
      });

      const results = await Promise.all(uploadPromises);
      setUploadedDocuments(prev => [...prev, ...results]);
      setSelectedFiles([]);
      setDocumentTypes({});
      setUploadProgress(0);
      
      toast.success(`${results.length} document(s) uploaded successfully`);
      onUploadComplete?.();
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (documentId: Id<"dealer_uploaded_documents">) => {
    try {
      const result = await generateDownloadUrl({ documentId });
      window.open(result.downloadUrl, '_blank');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download document');
    }
  };

  const handleDelete = async (documentId: Id<"dealer_uploaded_documents">) => {
    try {
      await deleteDocument({ documentId });
      setUploadedDocuments(prev => prev.filter(doc => doc._id !== documentId));
      toast.success('Document deleted successfully');
      onUploadComplete?.();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Custom Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-primary">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-sm text-muted-foreground">
                  PDF, DOC, DOCX, JPG, PNG up to 10MB
                </p>
              </div>
            )}
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Selected Files</h4>
              {selectedFiles.map((file, index) => (
                <div key={`${file.name}-${file.size}`} className="flex items-center gap-3 p-3 border rounded-lg">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                  <Select
                    value={documentTypes[`${file.name}-${file.size}`] || 'contract'}
                    onValueChange={(value) => updateDocumentType(index, value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading... {Math.round(uploadProgress)}%
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload {selectedFiles.length} Document(s)
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Uploaded Documents */}
      {uploadedDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Uploaded Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadedDocuments.map((doc) => (
                <div key={doc._id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.documentName}</p>
                    <p className="text-sm text-muted-foreground">
                      {doc.documentType} • {formatFileSize(doc.fileSize)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc._id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Document</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete &quot;{doc.documentName}&quot;? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(doc._id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
