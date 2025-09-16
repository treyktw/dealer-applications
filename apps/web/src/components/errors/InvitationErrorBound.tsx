  // components/InvitationErrorBoundary.tsx
"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: string | null;
}

export class InvitationErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Extract meaningful error message
    let errorMessage = "Something went wrong with your invitation.";
    
    if (error.message.includes("expired")) {
      errorMessage = "This invitation has expired. Please request a new one.";
    } else if (error.message.includes("invalid")) {
      errorMessage = "This invitation link is invalid.";
    } else if (error.message.includes("no longer valid")) {
      errorMessage = "This invitation is no longer valid.";
    } else if (error.message.includes("revoked")) {
      errorMessage = "This invitation has been revoked.";
    }

    return {
      hasError: true,
      error: errorMessage,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Invitation error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-900">
          <Card className="w-full max-w-md bg-neutral-800 border-neutral-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-amber-400" />
                <h3 className="mt-2 text-lg font-medium text-neutral-100">
                  Invitation Issue
                </h3>
                <p className="mt-1 text-sm text-neutral-400">
                  {this.state.error}
                </p>
                <div className="mt-6 space-y-3">
                  <Button 
                    onClick={() => window.location.reload()} 
                    className="w-full bg-neutral-600 hover:bg-neutral-500 text-neutral-100"
                  >
                    Try Again
                  </Button>
                  <Link href="/sign-in">
                    <Button 
                      variant="outline" 
                      className="w-full bg-neutral-700 border-neutral-600 text-neutral-200 hover:bg-neutral-600"
                    >
                      Go to Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper component for the invitation page
export function InvitationPageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <InvitationErrorBoundary>
      {children}
    </InvitationErrorBoundary>
  );
}