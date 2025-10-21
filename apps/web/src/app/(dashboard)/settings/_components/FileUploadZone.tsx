"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FileUploadZoneProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
}


const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export function FileUploadZone({ onFileSelect, selectedFile }: FileUploadZoneProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setError(null);

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0]?.code === "file-too-large") {
          setError("File is too large. Maximum size is 25MB.");
          toast.error("File is too large. Maximum size is 25MB.");
        } else if (rejection.errors[0]?.code === "file-invalid-type") {
          setError("Invalid file type. Only PDF files are allowed.");
          toast.error("Invalid file type. Only PDF files are allowed.");
        }
        return;
      }

      // Handle accepted file
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        onFileSelect(file);
        toast.success(`Selected: ${file.name}`);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
  });

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    setError(null);
  };

  return (
    <div className="space-y-2">
      <Card
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed cursor-pointer transition-colors",
          isDragActive && "border-primary bg-primary/5",
          error && "border-destructive",
          selectedFile && "border-primary"
        )}
      >
        <input {...getInputProps()} />
        <div className="p-8 text-center">
          {selectedFile ? (
            <div className="space-y-4">
              <div className="flex gap-3 justify-center items-center">
                <div className="p-3 rounded-lg bg-primary/10">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium truncate">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  className="shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Click or drag to replace file
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-muted">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-medium">
                  {isDragActive ? "Drop your PDF here" : "Choose a PDF or drag it here"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Maximum file size: 25MB
                </p>
              </div>
              <Button type="button" variant="outline" size="sm">
                Browse Files
              </Button>
            </div>
          )}
        </div>
      </Card>

      {error && (
        <div className="flex gap-2 items-center text-sm text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}