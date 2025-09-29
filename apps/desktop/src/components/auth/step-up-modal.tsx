// src/components/auth/step-up-modal.tsx
import { useId, useState } from 'react'
import { useSignIn, useUser, useAuth } from '@clerk/clerk-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface StepUpModalProps {
  isOpen: boolean
  onSuccess: (token: string) => void
  onCancel: () => void
  reason?: string
}

export function StepUpModal({ isOpen, onSuccess, onCancel, reason }: StepUpModalProps) {
  const { signIn } = useSignIn()
  const { user } = useUser()
  const { getToken } = useAuth()
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleStepUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signIn) return

    setIsLoading(true)
    try {
      // Re-authenticate with password to get fresh token
      const result = await signIn.create({
        strategy: 'password',
        password,
        identifier: user?.emailAddresses[0].emailAddress || '',
      })

      if (result.status === 'complete') {
        // Get fresh token with short expiry
        const token = await getToken({ 
          skipCache: true,
          template: 'step_up' // Configure this in Clerk
        })
        if (token) {
          onSuccess(token)
          toast.success('Authentication confirmed')
        }
      }
    } catch (error) {
      toast.error('Authentication failed', {
        description: error instanceof Error ? error.message : 'Authentication failed',
      })
    } finally {
      setIsLoading(false)
      setPassword('')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <DialogTitle>Security Verification Required</DialogTitle>
          </div>
          <DialogDescription>
            {reason || 'Please confirm your identity to continue with this sensitive action.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleStepUp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="step-up-password">Password</Label>
            <Input
              id={useId()}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoFocus
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !password}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}