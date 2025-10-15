// src/routes/__root.tsx
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { Toaster } from 'react-hot-toast'

type AuthContext = {
  auth: {
    isLoaded: boolean;
    isSignedIn: boolean;
    userId: string | null | undefined;
  };
};

export const Route = createRootRouteWithContext<AuthContext>()({
  component: RootComponent,
})

function RootComponent() {
  
  // Pass auth context down to all routes
  return (
    <>
      <Outlet />
      <Toaster 
        position="top-right"
        toastOptions={{
          className: '',
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        }}
      />
    </>
  )
}