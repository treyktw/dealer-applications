'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function DesktopCallbackPage() {
  const searchParams = useSearchParams()
  const state = searchParams.get('state')
  const [status, setStatus] = useState('Redirecting to desktop app...')
  const [showFallback, setShowFallback] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!state) {
      setError('Missing state parameter')
      return
    }

    const attemptDeepLink = async () => {
      try {
        setStatus('Opening desktop app...')
        
        // Create the deep link URL
        const deepLink = `dealer-sign://oauth/callback?state=${state}`
        console.log('Redirecting to deep link:', deepLink)
        
        // Try multiple methods to open the deep link
        const methods = [
          () => {
            // Method 1: Direct window.location.href
            window.location.href = deepLink
          },
          () => {
            // Method 2: Create a temporary link and click it
            const link = document.createElement('a')
            link.href = deepLink
            link.style.display = 'none'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
          },
          () => {
            // Method 3: Use window.open as fallback
            window.open(deepLink, '_self')
          }
        ]

        // Try each method with a small delay
        for (let i = 0; i < methods.length; i++) {
          try {
            methods[i]()
            console.log(`Deep link method ${i + 1} attempted`)
            
            // Wait a bit before trying next method
            if (i < methods.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 500))
            }
          } catch (err) {
            console.warn(`Deep link method ${i + 1} failed:`, err)
          }
        }

        // Set success status
        setStatus('✓ Desktop app should be opening...')
        
        // Show fallback message after 3 seconds
        setTimeout(() => {
          setShowFallback(true)
          setStatus('Authentication successful!')
        }, 3000)

      } catch (err) {
        console.error('Deep link error:', err)
        setError('Failed to open desktop app')
        setShowFallback(true)
      }
    }

    attemptDeepLink()
  }, [state])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-4xl">❌</div>
          <h2 className="text-xl font-bold text-destructive">Error</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => window.close()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90"
          >
            Close Window
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center space-y-4 max-w-md">
        {!showFallback ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="text-lg font-medium">{status}</p>
            <p className="text-sm text-muted-foreground">
              Please wait while we redirect you to the desktop app...
            </p>
          </>
        ) : (
          <div className="space-y-4">
            <div className="text-4xl">✅</div>
            <h2 className="text-xl font-bold text-green-600">Authentication Successful!</h2>
            <p className="text-sm text-muted-foreground">
              You can now close this window and return to the desktop app.
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => window.close()}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90"
              >
                Close Window
              </button>
              <p className="text-xs text-muted-foreground">
                If the desktop app didn&apos;t open automatically, please check that it&apos;s installed and running.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}