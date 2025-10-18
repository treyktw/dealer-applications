import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'

export const Route = createFileRoute('/oauth-callback')({
  component: OAuthCallback,
})

function OAuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('Processing authentication...')

  useEffect(() => {
    // This route is deprecated - OAuth flow now uses /auth-verify
    setStatus('Redirecting to login...')
    toast('OAuth callback has been updated. Please use the new login flow.', { duration: 4000 })
    
    setTimeout(() => {
      navigate({ to: '/login' })
    }, 2000)
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center space-y-4 max-w-md">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        <p className="text-lg font-medium">{status}</p>
        <p className="text-xs text-muted-foreground">
          This page will be removed in a future update
        </p>
      </div>
    </div>
  )
}