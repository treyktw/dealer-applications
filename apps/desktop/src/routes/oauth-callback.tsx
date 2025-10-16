import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth, useClerk } from '@clerk/clerk-react'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'

export const Route = createFileRoute('/oauth-callback')({
  component: OAuthCallback,
})

function OAuthCallback() {
  const navigate = useNavigate()
  const { isLoaded, isSignedIn } = useAuth()
  const clerk = useClerk()
  const [status, setStatus] = useState('Processing authentication...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setStatus('Checking authentication state...')
        
        // Get the current URL parameters
        const params = new URLSearchParams(window.location.search)
        const state = params.get('state')
        
        setStatus(`State received: ${state?.substring(0, 8)}...`)
        
        // Verify state (CSRF protection)
        const savedState = sessionStorage.getItem('oauth_state')
        sessionStorage.removeItem('oauth_state')
        
        if (!state) {
          throw new Error('No state parameter provided')
        }
        
        if (!savedState) {
          throw new Error('No saved state found - please try the authentication flow again')
        }
        
        if (state !== savedState) {
          throw new Error('State mismatch - possible security issue or expired session')
        }

        setStatus('State verified. Waiting for Clerk session...')

        // The user should already be signed in from the web flow
        // We just need to wait for Clerk to sync the session
        if (!isLoaded) {
          setStatus('Loading Clerk...')
          return
        }

        if (isSignedIn) {
          setStatus('✓ Signed in! Redirecting...')
          toast.success('Successfully signed in!')
          
          // Small delay to show success message
          setTimeout(() => {
            navigate({ to: '/' })
          }, 1000)
        } else {
          // Try to handle the redirect manually
          setStatus('Attempting to complete sign-in...')
          
          // Check if there's a Clerk ticket in the URL
          const ticket = params.get('__clerk_ticket')
          if (ticket) {
            setStatus('Processing Clerk ticket...')
            try {
              await clerk.handleRedirectCallback({
                redirectUrl: '/',
              })
              setStatus('✓ Sign-in completed!')
              navigate({ to: '/' })
            } catch (ticketError) {
              console.error('Clerk ticket processing failed:', ticketError)
              throw new Error('Failed to process authentication ticket. Please try again.')
            }
          } else {
            // Try to wait a bit more for Clerk to sync
            setStatus('Waiting for authentication to sync...')
            await new Promise(resolve => setTimeout(resolve, 2000))
            
            if (isSignedIn) {
              setStatus('✓ Authentication synced!')
              navigate({ to: '/' })
            } else {
              throw new Error('No active session found. Please try signing in again.')
            }
          }
        }
      } catch (err) {
        console.error('OAuth callback error:', err)
        const errorMsg = err instanceof Error ? err.message : 'Authentication failed'
        setError(errorMsg)
        setStatus('❌ Error occurred')
        toast.error(errorMsg)
      }
    }

    handleCallback()
  }, [isLoaded, isSignedIn, navigate, clerk])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-4xl">❌</div>
          <h2 className="text-xl font-bold text-destructive">Authentication Error</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => navigate({ to: '/login' })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center space-y-4 max-w-md">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        <p className="text-lg font-medium">{status}</p>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Clerk Loaded: {isLoaded ? '✅' : '⏳'}</p>
          <p>Signed In: {isSignedIn ? '✅' : '❌'}</p>
        </div>
      </div>
    </div>
  )
}