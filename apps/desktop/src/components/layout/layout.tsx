// src/components/layout/layout-redesign.tsx
import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './Header';
import { useUnifiedAuth } from '@/components/auth/useUnifiedAuth';
import { Loader2 } from 'lucide-react';

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, isLoading } = useUnifiedAuth();
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Show loading state while auth is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading layout...</p>
        </div>
      </div>
    );
  }

  // Show error state if user is not available (shouldn't happen due to AuthGuard, but just in case)
  if (!user) {
    console.error("❌ [LAYOUT] User not available - Sidebar and Header will not render");
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="p-4 bg-destructive/10 rounded-full">
            <Loader2 className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2">Authentication Error</h2>
            <p className="text-sm text-muted-foreground">
              Unable to load user information. Please refresh the page or log in again.
            </p>
          </div>
          <div className="mt-4 p-4 bg-muted rounded-lg text-left text-xs font-mono">
            <p className="font-semibold mb-2">Debug Info:</p>
            <p>isLoading: {String(isLoading)}</p>
            <p>user: {user ? "exists" : "null"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      <Header sidebarOpen={sidebarOpen} />
      
      <main
        className="transition-all duration-300 ease-in-out pt-16"
        style={{
          marginLeft: sidebarOpen ? '256px' : '64px',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}