"use client";

import { useState } from "react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface AddNoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string) => Promise<void>;
}

export function AddNoteDialog({
  isOpen,
  onClose,
  onSubmit
}: AddNoteDialogProps) {
  const [noteContent, setNoteContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!noteContent.trim()) return;
    
    try {
      setIsSubmitting(true);
      await onSubmit(noteContent);
      setNoteContent("");
    } catch (error) {
      console.error("Error submitting note:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Note</DialogTitle>
          <DialogDescription>
            Add a note to this client&apos;s activity history.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <Textarea
            placeholder="Enter your note here..."
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            className="min-h-32"
          />
        </div>
        
        <DialogFooter className="mt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || !noteContent.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Note"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}