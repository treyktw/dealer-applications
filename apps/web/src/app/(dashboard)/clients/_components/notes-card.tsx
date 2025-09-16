"use client";

import Link from "next/link";
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";

interface ClientNotesCardProps {
  clientId: string;
  notes: string | null;
}

export function ClientNotesCard({ clientId, notes }: ClientNotesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
      </CardHeader>
      <CardContent>
        {notes ? (
          <p className="text-sm whitespace-pre-line">{notes}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No notes available</p>
        )}
      </CardContent>
      <CardFooter className="border-t">
        <Button variant="outline" className="w-full" asChild>
          <Link href={`/clients/${clientId}/edit?tab=details`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Notes
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}