// src/app/access-denied/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="bg-destructive/10 text-destructive p-3 rounded-md inline-block mx-auto">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-12 w-12"
          >
            <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
            <line x1="6" y1="1" x2="6" y2="4"></line>
            <line x1="10" y1="1" x2="10" y2="4"></line>
            <line x1="14" y1="1" x2="14" y2="4"></line>
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold">Access Denied</h1>
        
        <p className="text-muted-foreground">
          Your IP address is not authorized to access the admin area.
        </p>
        
        <div className="pt-4">
          <p className="text-muted-foreground text-sm mb-4">
            If you believe this is an error, please contact your system administrator
            to have your IP address added to the allowed list.
          </p>
          
          <Button asChild>
            <Link href="/sign-in">Return to Login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}