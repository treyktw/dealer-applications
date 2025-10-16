'use client'
import { SignIn } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export default function DesktopSSOPage() {
  const searchParams = useSearchParams()
  const state = searchParams.get('state')

  useEffect(() => {
    console.log('=== DESKTOP SSO PAGE ===')
    console.log('State parameter:', state)
    console.log('Will redirect to web callback first')
    console.log('========================')
  }, [state])

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-destructive">Invalid Request</h2>
          <p>Missing security parameter. Please try again from the desktop app.</p>
        </div>
      </div>
    )
  }

  // Use HTTPS callback page instead of deep link
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/desktop-callback?state=${state}`

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-6 p-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Desktop App Authentication</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to continue to the desktop application
          </p>
        </div>
        
        <SignIn
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-lg',
            },
          }}
          forceRedirectUrl={callbackUrl}
          fallbackRedirectUrl={callbackUrl}
          signUpUrl="/sign-up"
        />

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            After signing in, you&apos;ll be redirected back to the desktop app
          </p>
        </div>
      </div>
    </div>
  )
}