// src/components/auth/login-form.tsx
import { useState, useEffect } from "react"
import { useSignIn } from "@clerk/clerk-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "react-hot-toast"
import { rateLimiter } from "@/lib/auth/rate-limiter"
import { cn } from "@/lib/utils"

export function LoginForm() {
  const { isLoaded, signIn, setActive } = useSignIn()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [lockoutTimer, setLockoutTimer] = useState(0)

  useEffect(() => {
    if (lockoutTimer > 0) {
      const interval = setInterval(() => {
        const remaining = rateLimiter.getRemainingLockTime(email)
        if (remaining <= 0) {
          setLockoutTimer(0)
        } else {
          setLockoutTimer(Math.ceil(remaining / 1000))
        }
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [lockoutTimer, email])

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded || !signIn) return

    const rateLimit = rateLimiter.recordAttempt(email)
    
    if (!rateLimit.allowed) {
      const seconds = Math.ceil((rateLimit.lockedUntil! - Date.now()) / 1000)
      setLockoutTimer(seconds)
      toast.error(`Too many attempts. Try again in ${seconds} seconds`)
      return
    }

    setIsLoading(true)

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      })

      if (result.status === "complete") {
        rateLimiter.reset(email)
        await setActive({ session: result.createdSessionId })
        toast.success("Welcome back!")
      } else {
        toast.error("Invalid credentials")
      }
    } catch (err: any) {
      if (rateLimit.remainingAttempts) {
        toast.error(`Invalid credentials. ${rateLimit.remainingAttempts} attempts remaining`)
      } else {
        toast.error("Invalid email or password")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (!isLoaded || !signIn) return
    
    setIsLoading(true)
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      })
    } catch (err) {
      toast.error("Failed to sign in with Google")
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full space-y-6">
      <Button
        onClick={handleGoogleSignIn}
        disabled={isLoading || lockoutTimer > 0}
        variant="secondary"
        className="w-full"
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Sign in with Google
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-zinc-300 dark:border-zinc-600" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-zinc-50 dark:bg-zinc-900 px-2 text-zinc-500 dark:text-zinc-400">
            Or continue with
          </span>
        </div>
      </div>

      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-zinc-700 dark:text-zinc-200">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading || lockoutTimer > 0}
            required
            className="bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-white"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-zinc-700 dark:text-zinc-200">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              placeholder="Enter your password"
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading || lockoutTimer > 0}
              required
              className="bg-white  dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-white pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-center">
          {/* //! This is a placeholder for the forgot password button. It will be implemented later. */}
          <Button variant="link" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-0 h-auto text-sm">
            Forgot Password?
          </Button>
        </div>

        <Button
          type="submit"
          disabled={isLoading || lockoutTimer > 0 || !email || !password}
          className={cn(
            "w-full",
            lockoutTimer > 0 
              ? "bg-red-600 hover:bg-red-600" 
              : "bg-blue-600 hover:bg-blue-700"
          )}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : lockoutTimer > 0 ? (
            `Locked (${lockoutTimer}s)`
          ) : (
            "Sign In"
          )}
        </Button>
      </form>
    </div>
  )
}