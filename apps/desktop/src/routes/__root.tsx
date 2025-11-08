// src/routes/__root.tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { Toaster } from 'react-hot-toast'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { SubscriptionProvider } from '@/lib/subscription/SubscriptionProvider'
import { useEffect } from 'react'
import { setupDeepLinkListener } from '@/lib/deeplink-listener'
import { getCachedAppMode } from '@/lib/mode-detection'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const appMode = getCachedAppMode()
  const isStandalone = appMode === 'standalone'

  useEffect(() => {
    console.log('🚀 Root layout mounting - setting up deep link listener...');
    
    let unlisten: (() => void) | undefined;
    
    setupDeepLinkListener()
      .then((unlistenFn) => {
        unlisten = unlistenFn;
        console.log('✅ Deep link listener setup complete');
      })
      .catch((error) => {
        console.error('❌ Failed to setup deep link listener:', error);
      });
    
    return () => {
      console.log('🔌 Root layout unmounting - cleaning up');
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  const content = (
    <SubscriptionProvider>
      <Outlet />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </SubscriptionProvider>
  )

  if (isStandalone) {
    return content
  }

  return <AuthGuard>{content}</AuthGuard>
}