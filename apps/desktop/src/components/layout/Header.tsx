// src/components/layout/Header.tsx
import { useState, useCallback } from 'react'
import { useClerk, useUser } from '@clerk/clerk-react'
import { Search, Menu, LogOut, X } from 'lucide-react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { toast } from 'react-hot-toast'
import { ThemeToggle } from '../theme/theme-toggle'

interface HeaderProps {
  toggleSidebar?: () => void
  sidebarOpen?: boolean
}

export function Header({ toggleSidebar, sidebarOpen = true }: HeaderProps) {
  const { user } = useUser()
  const clerk = useClerk()
  const [searchQuery, setSearchQuery] = useState('')
  const [showSignOutDialog, setShowSignOutDialog] = useState(false)

  // Fast sign out - no waiting, no cleanup, just redirect
  const handleSignOut = useCallback(() => {
    // Close dialog immediately
    setShowSignOutDialog(false)
    
    // Show toast briefly
    toast.success('Signing out...')
    
    // Small delay to show toast, then sign out and redirect
    setTimeout(() => {
      clerk.signOut().then(() => {
        // Clerk will handle the redirect, but as a fallback:
        window.location.replace('/login')
      }).catch(() => {
        // On any error, just redirect
        window.location.replace('/login')
      })
    }, 100)
  }, [clerk])

  return (
    <header 
      className="fixed top-0 right-0 z-30 bg-background border-b border-border"
      style={{
        height: '60px',
        left: sidebarOpen ? '280px' : '0',
        width: sidebarOpen ? 'calc(100% - 280px)' : '100%',
        transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left Section: Menu Toggle + Dealership Name */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-accent rounded-md transition-colors"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? (
              <X className="w-5 h-5 text-foreground" />
            ) : (
              <Menu className="w-5 h-5 text-foreground" />
            )}
          </button>
          
          <div className="text-lg font-semibold text-foreground">
            Premium Auto Group
          </div>
        </div>

        {/* Center Section: Search */}
        <div className="flex-1 max-w-xl mx-8">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full bg-background border-input"
            />
          </div>
        </div>

        {/* Right Section: User Profile + Sign Out */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* Divider */}
          <div className="h-6 w-px bg-border" />
          
          <div className="flex items-center gap-3">
            {/* User Avatar */}
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-foreground">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            
            {/* User Info */}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="text-xs text-muted-foreground">
                {user?.primaryEmailAddress?.emailAddress}
              </span>
            </div>
          </div>

          {/* Sign Out Button */}
          <Dialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                size="sm"
                className="ml-2"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Sign Out</DialogTitle>
                <DialogDescription>
                  Are you sure you want to sign out?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowSignOutDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSignOut}
                  variant="destructive"
                >
                  Sign Out
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  )
}