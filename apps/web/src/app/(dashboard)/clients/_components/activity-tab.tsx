"use client";

import { Card, CardHeader, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Mail } from "lucide-react";

export interface Activity {
  id: string;
  type: 'note' | 'email';
  content: string;
  date: string;
  user: string;
}

interface ClientActivityTabProps {
  activities: Activity[];
  onAddNote?: () => void;
}

export function ClientActivityTab({ 
  activities,
  onAddNote 
}: ClientActivityTabProps) {
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity History</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div 
                key={activity.id} 
                className="flex gap-3 border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="min-w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  {activity.type === "note" && <MessageSquare className="h-4 w-4" />}
                  {activity.type === "email" && <Mail className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{activity.user}</p>
                  <p className="text-sm">{activity.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(activity.date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No activity recorded for this client
          </p>
        )}
      </CardContent>
      <CardFooter className="border-t">
        <Button 
          variant="outline" 
          className="w-full"
          onClick={onAddNote}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Add Note
        </Button>
      </CardFooter>
    </Card>
  );
}