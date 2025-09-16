// src/components/documents/DocumentList.tsx
import { useReducer } from 'react';
import { useMutation } from '@tanstack/react-query';
import { convexAction, convexMutation } from '@/lib/convex';
import { api } from '@dealer/convex';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  FileText,
  Download,
  Eye,
  Upload,
  CheckCircle2,
  Clock,
  Loader2,
  FileUp,
  Hash
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

interface DocumentListProps {
  pack: any;
  onRefresh: () => void;
}

interface DocumentListState {
  selectedDoc: number | null;
  isGenerating: number | null;
  uploadModalOpen: boolean;
  uploadingIndex: number | null;
  uploadFile: File | null;
}

type DocumentListAction =
  | { type: 'SET_SELECTED_DOC'; payload: number | null }
  | { type: 'SET_GENERATING'; payload: number | null }
  | { type: 'SET_UPLOAD_MODAL'; payload: boolean }
  | { type: 'SET_UPLOADING_INDEX'; payload: number | null }
  | { type: 'SET_UPLOAD_FILE'; payload: File | null }
  | { type: 'RESET_UPLOAD' };

const initialState: DocumentListState = {
  selectedDoc: null,
  isGenerating: null,
  uploadModalOpen: false,
  uploadingIndex: null,
  uploadFile: null,
};

function documentListReducer(state: DocumentListState, action: DocumentListAction): DocumentListState {
  switch (action.type) {
    case 'SET_SELECTED_DOC':
      return { ...state, selectedDoc: action.payload };
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.payload };
    case 'SET_UPLOAD_MODAL':
      return { ...state, uploadModalOpen: action.payload };
    case 'SET_UPLOADING_INDEX':
      return { ...state, uploadingIndex: action.payload };
    case 'SET_UPLOAD_FILE':
      return { ...state, uploadFile: action.payload };
    case 'RESET_UPLOAD':
      return { ...state, uploadModalOpen: false, uploadingIndex: null, uploadFile: null };
    default:
      return state;
  }
}

export function DocumentList({ pack, onRefresh }: DocumentListProps) {
  const [state, dispatch] = useReducer(documentListReducer, initialState);

  // Generate single document
  const generateDocument = useMutation({
    mutationFn: async (index: number) => {
      dispatch({ type: 'SET_GENERATING', payload: index });
      
      const result = await convexAction(api.api.pdfProcessor.generatePrefillPDF, {
        packId: pack._id,
        documentIndex: index,
      });
      
      return result;
    },
    onSuccess: (data) => {
      dispatch({ type: 'SET_GENERATING', payload: null });
      toast.success('Document generated successfully');
      
      // Open download URL in new tab
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      }
      
      onRefresh();
    },
    onError: (error) => {
      dispatch({ type: 'SET_GENERATING', payload: null });
      toast.error(`Generation failed: ${error.message}`);
    },
  });

  // Upload signed document
  const uploadSignedDocument = useMutation({
    mutationFn: async ({ index, file }: { index: number; file: File }) => {
      // Calculate file hash
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Get upload URL from S3
      const uploadUrlResult = await convexMutation(api.api.secure_s3.getSecureUploadUrl, {
        dealershipId: pack.dealershipId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        category: 'documents',
      });
      
      // Upload to S3
      const uploadResponse = await fetch(uploadUrlResult.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to S3');
      }
      
      // Update document record
      await convexAction(api.api.pdfProcessor.recordSignedDocument, {
        packId: pack._id,
        documentIndex: index,
        signedPdfUrl: `https://s3.amazonaws.com/${uploadUrlResult.filePath}`,
        signedPdfSha256: hashHex,
      });
      
      return { success: true, hash: hashHex };
    },
    onSuccess: () => {
      toast.success('Signed document uploaded successfully');
      dispatch({ type: 'RESET_UPLOAD' });
      onRefresh();
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { 
        label: 'Pending', 
        variant: 'secondary' as const,
        icon: Clock,
        color: 'text-gray-600',
      },
      generated: { 
        label: 'Generated', 
        variant: 'default' as const,
        icon: FileText,
        color: 'text-blue-600',
      },
      signed: { 
        label: 'Signed', 
        variant: 'success' as const,
        icon: CheckCircle2,
        color: 'text-green-600',
      },
      uploaded: { 
        label: 'Complete', 
        variant: 'success' as const,
        icon: CheckCircle2,
        color: 'text-green-600',
      },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge 
        variant={config.variant}
        className="flex items-center gap-1"
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Please select a PDF file');
        return;
      }
      
      if (file.size > 25 * 1024 * 1024) { // 25MB limit
        toast.error('File size must be less than 25MB');
        return;
      }
      
      dispatch({ type: 'SET_UPLOAD_FILE', payload: file });
    }
  };

  return (
    <div className="space-y-4">
      {/* Document Cards */}
      {pack.documents.map((doc: any, index: number) => (
        <Card key={index}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {doc.documentName}
              </CardTitle>
              {getStatusBadge(doc.status)}
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Template: {doc.templateType}
                </p>
                
                {doc.generatedAt && (
                  <p className="text-sm text-muted-foreground">
                    Generated: {new Date(doc.generatedAt).toLocaleString()}
                  </p>
                )}
                
                {doc.generatedPdfSha256 && (
                  <div className="flex items-center gap-2 text-xs">
                    <Hash className="h-3 w-3" />
                    <code className="font-mono">
                      {doc.generatedPdfSha256.substring(0, 8)}...
                    </code>
                  </div>
                )}
                
                {doc.signedAt && (
                  <p className="text-sm text-muted-foreground">
                    Signed: {new Date(doc.signedAt).toLocaleString()}
                  </p>
                )}
              </div>
              
              <div className="flex gap-2">
                {/* Generate/Regenerate Button */}
                {doc.status === 'pending' || doc.status === 'generated' ? (
                  <Button
                    size="sm"
                    variant={doc.status === 'pending' ? 'default' : 'outline'}
                    onClick={() => generateDocument.mutate(index)}
                    disabled={state.isGenerating === index}
                  >
                    {state.isGenerating === index ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        {doc.status === 'pending' ? 'Generate' : 'Regenerate'}
                      </>
                    )}
                  </Button>
                ) : null}
                
                {/* Download Button */}
                {doc.generatedPdfUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(doc.generatedPdfUrl, '_blank')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                )}
                
                {/* Preview Button */}
                {doc.generatedPdfUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => dispatch({ type: 'SET_SELECTED_DOC', payload: index })}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                )}
                
                {/* Upload Signed Button */}
                {doc.status === 'generated' && !doc.signedPdfUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      dispatch({ type: 'SET_UPLOADING_INDEX', payload: index });
                      dispatch({ type: 'SET_UPLOAD_MODAL', payload: true });
                    }}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Signed
                  </Button>
                )}
                
                {/* View Signed Button */}
                {doc.signedPdfUrl && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => window.open(doc.signedPdfUrl, '_blank')}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    View Signed
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {/* Document Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Document Pack Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{pack.documents.length}</p>
              <p className="text-sm text-muted-foreground">Total Documents</p>
            </div>
            
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {pack.documents.filter((d: any) => d.status === 'generated').length}
              </p>
              <p className="text-sm text-muted-foreground">Generated</p>
            </div>
            
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {pack.documents.filter((d: any) => d.status === 'signed' || d.status === 'uploaded').length}
              </p>
              <p className="text-sm text-muted-foreground">Signed</p>
            </div>
            
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">
                {pack.documents.filter((d: any) => d.status === 'pending').length}
              </p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Upload Modal */}
      <Dialog open={state.uploadModalOpen} onOpenChange={(open) => dispatch({ type: 'SET_UPLOAD_MODAL', payload: open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Signed Document</DialogTitle>
            <DialogDescription>
              Upload the signed PDF for {state.uploadingIndex !== null ? pack.documents[state.uploadingIndex].documentName : ''}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {!state.uploadFile ? (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <FileUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-primary hover:underline">Choose a file</span>
                  <span className="text-muted-foreground"> or drag and drop</span>
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  PDF files only, up to 25MB
                </p>
              </div>
            ) : (
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">{state.uploadFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(state.uploadFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dispatch({ type: 'SET_UPLOAD_FILE', payload: null })}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => dispatch({ type: 'RESET_UPLOAD' })}
              >
                Cancel
              </Button>
              
              <Button
                onClick={() => {
                  if (state.uploadFile && state.uploadingIndex !== null) {
                    uploadSignedDocument.mutate({
                      index: state.uploadingIndex,
                      file: state.uploadFile,
                    });
                  }
                }}
                disabled={!state.uploadFile || uploadSignedDocument.isPending}
              >
                {uploadSignedDocument.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}