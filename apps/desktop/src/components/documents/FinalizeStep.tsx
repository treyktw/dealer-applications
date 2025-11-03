import { CheckCircle2, Download, Printer, Mail, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useMutation } from "@tanstack/react-query";
import { convexAction, convexMutation } from "@/lib/convex";
import { api } from "@dealer/convex";
import type { Id } from "@dealer/convex";
import JSZip from "jszip";
import { EmailDialog } from "./EmailDialog";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";

interface FinalizeStepProps {
  onBack: () => void;
  onComplete: () => void;
  dealsId: string;
  documents?: any[];
  customDocuments?: any[];
  dealDetails?: {
    client?: {
      firstName?: string;
      lastName?: string;
      email?: string | null;
    };
  };
  sessionToken?: string;
}

export function FinalizeStep({
  onBack,
  onComplete,
  dealsId,
  documents = [],
  customDocuments = [],
  dealDetails,
  sessionToken,
}: FinalizeStepProps) {
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [downloadedZipPath, setDownloadedZipPath] = useState<string | null>(null);

  // Archive deal mutation
  const archiveDeal = useMutation({
    mutationFn: async () => {
      if (!sessionToken) throw new Error("No session token");
      return convexMutation(api.api.deals.updateDealStatus, {
        dealId: dealsId as Id<"deals">,
        status: "completed",
      });
    },
    onSuccess: () => {
      toast.success("Deal archived successfully");
      onComplete();
    },
    onError: (error) => {
      console.error("Archive error:", error);
      toast.error("Failed to archive deal");
    },
  });

  // Email mutation
  const sendEmail = useMutation({
    mutationFn: async (email: string) => {
      if (!sessionToken) throw new Error("No session token");
      return convexAction(api.api.documents.sendDealDocumentsEmail, {
        dealId: dealsId as Id<"deals">,
        clientEmail: email,
        token: sessionToken,
      });
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setEmailDialogOpen(false);
    },
    onError: (error) => {
      console.error("Email error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send email");
    },
  });

  // Helper: Download with retry logic
  const downloadWithRetry = async (url: string, retries = 3): Promise<ArrayBuffer> => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.arrayBuffer();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    throw new Error('Max retries exceeded');
  };

  // Download all documents as ZIP using Tauri
  const handleDownloadAll = async () => {
    if (!sessionToken) {
      toast.error("No session token available");
      return;
    }

    setIsDownloading(true);
    const loadingToast = toast.loading("Preparing documents...");

    try {
      const zip = new JSZip();
      const totalDocs = (documents?.length || 0) + (customDocuments?.length || 0);
      let completed = 0;

      // Download generated documents
      for (const doc of documents || []) {
        if (!doc._id || !doc.s3Key) continue;
        
        try {
          toast.loading(`Downloading ${completed + 1}/${totalDocs}...`, { id: loadingToast });
          
          const { downloadUrl } = await convexAction(
            api.api.documents.generator.getDocumentDownloadUrl,
            {
              documentId: doc._id as Id<"documentInstances">,
              token: sessionToken,
              expiresIn: 300,
            }
          );

          const arrayBuffer = await downloadWithRetry(downloadUrl);
          const docName = doc.template?.name || `Document-${doc._id}`;
          zip.file(`${docName}.pdf`, arrayBuffer);
          completed++;
        } catch (error) {
          console.error(`Failed to download document ${doc._id}:`, error);
        }
      }

      // Download custom documents
      for (const doc of customDocuments || []) {
        if (!doc._id) continue;
        
        try {
          toast.loading(`Downloading ${completed + 1}/${totalDocs}...`, { id: loadingToast });
          
          const { downloadUrl } = await convexAction(
            api.api.documents.generateCustomDocumentDownloadUrl,
            {
              documentId: doc._id as Id<"dealer_uploaded_documents">,
            }
          );

          const arrayBuffer = await downloadWithRetry(downloadUrl);
          const fileName = doc.documentName || `Custom-${doc._id}.pdf`;
          zip.file(fileName, arrayBuffer);
          completed++;
        } catch (error) {
          console.error(`Failed to download custom document ${doc._id}:`, error);
        }
      }

      if (completed === 0) {
        toast.error("No documents available to download", { id: loadingToast });
        return;
      }

      // Generate ZIP file
      toast.loading("Creating ZIP file...", { id: loadingToast });
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipArrayBuffer = await zipBlob.arrayBuffer();
      const zipUint8Array = new Uint8Array(zipArrayBuffer);

      // Get default downloads directory from Rust
      let defaultDir: string;
      try {
        defaultDir = await invoke<string>("get_downloads_dir");
      } catch (error) {
        console.warn("Could not get downloads dir, using fallback", error);
        defaultDir = "";
      }

      // Generate client-friendly filename
      const clientName = dealDetails?.client?.firstName && dealDetails?.client?.lastName
        ? `${dealDetails.client.firstName}-${dealDetails.client.lastName}`
        : 'client';
      
      const defaultFileName = `deal-${clientName}-${new Date().toISOString().split('T')[0]}.zip`;
      const defaultPath = defaultDir ? `${defaultDir}/${defaultFileName}` : defaultFileName;

      // Use Tauri dialog to save file
      const filePath = await save({
        defaultPath,
        filters: [{
          name: 'ZIP Archive',
          extensions: ['zip']
        }]
      });

      if (filePath) {
        // Write file using Tauri FS
        await writeFile(filePath, zipUint8Array);
        setDownloadedZipPath(filePath);
        
        toast.success(
          <div className="flex items-center gap-2">
            <span>Downloaded {completed} documents!</span>
            <button
              type="button"
              onClick={() => handleRevealInExplorer(filePath)}
              className="text-xs underline hover:no-underline"
            >
              Show in folder
            </button>
          </div>,
          { id: loadingToast, duration: 5000 }
        );
      } else {
        toast.dismiss(loadingToast);
      }

    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download documents", { id: loadingToast });
    } finally {
      setIsDownloading(false);
    }
  };

  // Reveal file in explorer
  const handleRevealInExplorer = async (filePath: string) => {
    try {
      await invoke("reveal_in_explorer", { filePath });
    } catch (error) {
      console.error("Failed to reveal file:", error);
      toast.error("Could not open file location");
    }
  };

  // Print all documents using Tauri shell with native backend
  const handlePrint = async () => {
    if (!sessionToken) {
      toast.error("No session token available");
      return;
    }

    setIsPrinting(true);
    const loadingToast = toast.loading("Preparing documents for printing...");

    try {
      // Create temp directory for print files
      const tempDir = await invoke<string>("create_temp_print_dir");
      const tempFiles: string[] = [];
      let downloadedCount = 0;

      // Download generated documents to temp location
      for (const doc of documents || []) {
        if (!doc._id || !doc.s3Key) continue;
        
        try {
          const { downloadUrl } = await convexAction(
            api.api.documents.generator.getDocumentDownloadUrl,
            {
              documentId: doc._id as Id<"documentInstances">,
              token: sessionToken,
              expiresIn: 300,
            }
          );

          const arrayBuffer = await downloadWithRetry(downloadUrl);
          const uint8Array = new Uint8Array(arrayBuffer);
          
          // Create temp file path
          const docName = (doc.template?.name || `Document-${doc._id}`).replace(/[^a-z0-9.]/gi, '-');
          const tempPath = `${tempDir}/${docName}.pdf`;
          
          // Use Rust command to write file (bypasses Tauri FS scope restrictions)
          await invoke("write_file_to_path", {
            filePath: tempPath,
            fileData: Array.from(uint8Array),
          });
          tempFiles.push(tempPath);
          downloadedCount++;
          
          toast.loading(
            `Preparing ${downloadedCount}/${(documents?.length || 0) + (customDocuments?.length || 0)} documents...`,
            { id: loadingToast }
          );
        } catch (error) {
          console.error(`Failed to prepare document ${doc._id} for printing:`, error);
        }
      }

      // Download custom documents to temp location
      for (const doc of customDocuments || []) {
        if (!doc._id) continue;
        
        try {
          const { downloadUrl } = await convexAction(
            api.api.documents.generateCustomDocumentDownloadUrl,
            {
              documentId: doc._id as Id<"dealer_uploaded_documents">,
            }
          );

          const arrayBuffer = await downloadWithRetry(downloadUrl);
          const uint8Array = new Uint8Array(arrayBuffer);
          
          const fileName = (doc.documentName || `Custom-${doc._id}`).replace(/[^a-z0-9.]/gi, '-');
          const tempPath = `${tempDir}/${fileName}`;
          
          // Use Rust command to write file (bypasses Tauri FS scope restrictions)
          await invoke("write_file_to_path", {
            filePath: tempPath,
            fileData: Array.from(uint8Array),
          });
          tempFiles.push(tempPath);
          downloadedCount++;
          
          toast.loading(
            `Preparing ${downloadedCount}/${(documents?.length || 0) + (customDocuments?.length || 0)} documents...`,
            { id: loadingToast }
          );
        } catch (error) {
          console.error(`Failed to prepare custom document ${doc._id} for printing:`, error);
        }
      }

      if (tempFiles.length === 0) {
        toast.error("No documents available to print", { id: loadingToast });
        await invoke("cleanup_temp_print_dir", { dirPath: tempDir });
        return;
      }

      // Batch print using Rust backend
      toast.loading(`Opening ${tempFiles.length} document(s) for printing...`, { id: loadingToast });
      
      const successCount = await invoke<number>("batch_print_pdfs", { 
        filePaths: tempFiles 
      });

      // Clean up temp files after a delay (give time for print dialogs to open)
      setTimeout(async () => {
        try {
          await invoke("cleanup_temp_print_dir", { dirPath: tempDir });
        } catch (error) {
          console.error("Failed to cleanup temp directory:", error);
        }
      }, 5000);

      if (successCount > 0) {
        toast.success(
          `Opened ${successCount} of ${tempFiles.length} document(s). Use your PDF viewer's print dialog to print.`,
          { id: loadingToast, duration: 5000 }
        );
      } else {
        toast.error("Failed to open documents for printing", { id: loadingToast });
      }

    } catch (error) {
      console.error("Print error:", error);
      toast.error("Failed to prepare documents for printing", { id: loadingToast });
    } finally {
      setIsPrinting(false);
    }
  };

  // Email client
  const handleEmail = () => {
    const clientEmail = dealDetails?.client?.email || null;

    if (clientEmail) {
      sendEmail.mutate(clientEmail);
    } else {
      setEmailDialogOpen(true);
    }
  };

  const handleEmailSubmit = (email: string) => {
    sendEmail.mutate(email);
  };

  // Complete all documents then archive deal
  const completeAndArchive = useMutation({
    mutationFn: async () => {
      if (!sessionToken) throw new Error("No session token");
      const targets = (documents || []).filter((d) => (d.status || '').toUpperCase() !== 'FINALIZED');
      await Promise.all(
        targets.map((d) =>
          convexMutation((api as any).documents.generator.updateDocumentStatus, {
            documentId: d._id as Id<"documentInstances">,
            status: "FINALIZED",
            token: sessionToken,
          })
        )
      );
      await archiveDeal.mutateAsync();
    },
    onError: (error) => {
      console.error("Finalize error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to complete deal");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-semibold">Finalize Deal</h2>
        <p className="text-muted-foreground">
          Review and complete the deal
        </p>
      </div>

      {/* Success message */}
      <div className="p-6 bg-green-50 rounded-lg border border-green-200 dark:bg-green-950 dark:border-green-800">
        <div className="flex gap-3 items-start">
          <CheckCircle2 className="flex-shrink-0 w-6 h-6 text-green-600 dark:text-green-400" />
          <div>
            <h4 className="mb-1 font-semibold text-green-900 dark:text-green-100">
              All Steps Complete
            </h4>
            <p className="text-sm text-green-700 dark:text-green-300">
              All documents are ready and marked as completed
            </p>
          </div>
        </div>
      </div>

      {/* Downloaded file info */}
      {downloadedZipPath && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 dark:bg-blue-950 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-900 dark:text-blue-100">
                Documents downloaded successfully
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRevealInExplorer(downloadedZipPath)}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              <ExternalLink className="mr-1 w-4 h-4" />
              Show in folder
            </Button>
          </div>
        </div>
      )}

      {/* Actions grid */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="outline"
          className="flex-col justify-center h-24"
          onClick={handleDownloadAll}
          disabled={isDownloading || !sessionToken}
        >
          {isDownloading ? (
            <Loader2 className="mb-2 w-5 h-5 animate-spin" />
          ) : (
            <Download className="mb-2 w-5 h-5" />
          )}
          <span className="font-medium">Download All</span>
          <span className="text-xs text-muted-foreground">Get PDF package</span>
        </Button>

        <Button
          variant="outline"
          className="flex-col justify-center h-24"
          onClick={handlePrint}
          disabled={isPrinting || !sessionToken}
        >
          {isPrinting ? (
            <Loader2 className="mb-2 w-5 h-5 animate-spin" />
          ) : (
            <Printer className="mb-2 w-5 h-5" />
          )}
          <span className="font-medium">Print Documents</span>
          <span className="text-xs text-muted-foreground">Print all docs</span>
        </Button>

        <Button
          variant="outline"
          className="flex-col justify-center h-24"
          onClick={handleEmail}
          disabled={sendEmail.isPending || !sessionToken}
        >
          {sendEmail.isPending ? (
            <Loader2 className="mb-2 w-5 h-5 animate-spin" />
          ) : (
            <Mail className="mb-2 w-5 h-5" />
          )}
          <span className="font-medium">Email Client</span>
          <span className="text-xs text-muted-foreground">Send copies</span>
        </Button>

        {/* Archive happens as part of Complete Deal */}
      </div>

      {/* Email Dialog */}
      <EmailDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        onSubmit={handleEmailSubmit}
        defaultEmail={dealDetails?.client?.email || ""}
      />

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          size="lg"
          className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
          onClick={() => completeAndArchive.mutate()}
          disabled={completeAndArchive.isPending || archiveDeal.isPending}
        >
          {completeAndArchive.isPending || archiveDeal.isPending ? (
            <>
              <Loader2 className="mr-2 w-5 h-5 animate-spin" />
              Completing...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 w-5 h-5" />
              Complete Deal
            </>
          )}
        </Button>
      </div>
    </div>
  );
}