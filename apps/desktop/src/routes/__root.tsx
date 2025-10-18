// src/routes/__root.tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { Toaster } from 'react-hot-toast'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { SubscriptionProvider } from '@/lib/subscription/SubscriptionProvider'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <AuthGuard>
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
    </AuthGuard>
  )
}