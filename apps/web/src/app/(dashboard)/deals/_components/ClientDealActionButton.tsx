"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { DocumentGenerator } from "./DocumentGenerator";
import { Id } from "@/convex/_generated/dataModel";

interface ClientDealButtonProps {
  clientId: string;
}

export function ClientDealButton({ clientId }: ClientDealButtonProps) {
  const [showDocumentGenerator, setShowDocumentGenerator] = useState(false);

  const handleClick = () => {
    setShowDocumentGenerator(true);
  };

  const handleBack = () => {
    setShowDocumentGenerator(false);
  };

  if (showDocumentGenerator) {
    return <DocumentGenerator clientId={clientId as Id<"clients">} onBack={handleBack} />;
  }

  return (
    <Button onClick={handleClick}>
      <FileText className="mr-2 w-4 h-4" />
      Create Deal Documents
    </Button>
  );
}