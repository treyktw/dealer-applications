'use client'
import { useEffect, useId } from 'react'
import { useSearchParams } from 'next/navigation'

export default function DesktopCallbackPage() {
  const searchParams = useSearchParams()
  const state = searchParams.get('state')

  useEffect(() => {
    // Immediately redirect to deep link
    const deepLink = `dealer-sign://oauth/callback?state=${state}`
    console.log('Redirecting to deep link:', deepLink)
    
    // Try to open the deep link
    window.location.href = deepLink
    
    // Fallback message after 2 seconds
    setTimeout(() => {
      fallbackMessage()
    }, 2000)
  }, [state])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
        <div id={useId()} className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        <p>Returning to desktop app...</p>
      </div>
    </div>
  )
}

function fallbackMessage() {
  return (
    <div className="space-y-4">
      <p className="text-green-600">✓ Authentication successful!</p>
      <p className="text-sm text-muted-foreground">
        If the desktop app didn&apos;t open automatically, you can close this window.
      </p>
    </div>
  );
}