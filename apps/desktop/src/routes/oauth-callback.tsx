import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@clerk/clerk-react'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/oauth-callback')({
  component: OAuthCallback,
})

function OAuthCallback() {
  const navigate = useNavigate()
  const { isLoaded, isSignedIn } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Parse deep link parameters
        const url = new URL(window.location.href)
        const state = url.searchParams.get('state')
        
        // Verify state (CSRF protection)
        const savedState = sessionStorage.getItem('oauth_state')
        sessionStorage.removeItem('oauth_state')
        
        if (!state || state !== savedState) {
          throw new Error('Invalid state parameter - possible CSRF attack')
        }

        // Wait for Clerk to process the session
        if (isLoaded && isSignedIn) {
          // Success! Redirect to main app
          navigate({ to: '/' })
        }
      } catch (err) {
        console.error('OAuth callback error:', err)
        setError(err instanceof Error ? err.message : 'Authentication failed')
      }
    }

    handleCallback()
  }, [isLoaded, isSignedIn, navigate])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-destructive">Authentication Error</h2>
          <p>{error}</p>
          <button
            onClick={() => navigate({ to: '/login' })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded"
            type="button"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        <p>Completing authentication...</p>
      </div>
    </div>
  )
}