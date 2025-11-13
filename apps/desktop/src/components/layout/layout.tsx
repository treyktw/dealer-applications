// src/components/layout/layout-redesign.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Sidebar } from './sidebar';
import { Header } from './Header';
import { useUnifiedAuth } from '@/components/auth/useUnifiedAuth';
import { getCachedAppMode } from '@/lib/mode-detection';
import { Loader2 } from 'lucide-react';

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, isLoading } = useUnifiedAuth();
  const navigate = useNavigate();
  const appMode = getCachedAppMode();
  const isStandalone = appMode === "standalone";
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Redirect to login if user is not available (after logout)
  useEffect(() => {
    if (!isLoading && !user) {
      console.log("🔄 [LAYOUT] User not available, redirecting to login...");
      const loginRoute = isStandalone ? '/standalone-login' : '/login';
      navigate({ to: loginRoute });
    }
  }, [user, isLoading, navigate, isStandalone]);

  // Show loading state while auth is being determined
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <div className="flex flex-col gap-4 items-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading layout...</p>
        </div>
      </div>
    );
  }

  // Show redirecting state if user is not available (will redirect via useEffect)
  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <div className="flex flex-col gap-4 items-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      <Header sidebarOpen={sidebarOpen} />
      
      <main
        className="pt-16 transition-all duration-300 ease-in-out"
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