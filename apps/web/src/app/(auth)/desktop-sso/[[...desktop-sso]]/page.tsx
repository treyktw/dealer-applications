'use client'
import { SignIn } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'

export default function DesktopSSOPage() {
  const searchParams = useSearchParams()
  const state = searchParams.get('state') // CSRF protection
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <SignIn
        appearance={{
          elements: {
            rootBox: 'mx-auto',
          },
        }}
        fallbackRedirectUrl={`dealer-sign://oauth/callback?state=${state}`}
        signUpUrl="/sign-up" // Optional
      />
    </div>
  )
}