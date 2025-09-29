// src/components/auth/session-status.tsx
import { useAuth, useSession } from '@clerk/clerk-react'
import { Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SessionStatusProps {
  className?: string
  showDetails?: boolean
}

export function SessionStatus({ className, showDetails = false }: SessionStatusProps) {
  const { isSignedIn } = useAuth()
  const { session } = useSession()

  // Don't show anything if not signed in
  if (!isSignedIn || !session) {
    return null
  }

  const getStatusIcon = () => {
    return <Shield className="h-4 w-4 text-green-600" />
  }

  const getStatusText = () => {
    if (showDetails) {
      return 'Active'
    }
    return 'Online'
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="flex items-center space-x-1">
        {getStatusIcon()}
        <span className="text-sm font-medium text-green-600">
          {getStatusText()}
        </span>
      </div>
    </div>
  )
}
