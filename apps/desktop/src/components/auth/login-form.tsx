import { useState, useId } from "react"
import { useAuth } from "@/components/auth/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ExternalLink, Mail, ArrowLeft } from "lucide-react"
import { toast } from "react-hot-toast"

export function LoginForm() {
  const { requestVerificationCode, verifyCode } = useAuth()
  const [email, setEmail] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<"email" | "verify">("email")
  const [devCode, setDevCode] = useState<string | undefined>()
  const [googleStatus, setGoogleStatus] = useState<string>("")
  const emailInputId = useId()
  const codeInputId = useId()

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)

    try {
      const result = await requestVerificationCode(email)
      
      if (result.success) {
        setStep("verify")
        // In development, show the code
        if (result.code) {
          setDevCode(result.code)
          toast.success(`Verification code sent! (Dev: ${result.code})`, { duration: 8000 })
        } else {
          toast.success("Verification code sent to your email!")
        }
      } else {
        toast.error("Failed to send verification code")
      }
    } catch (error) {
      console.error('Request code error:', error)
      toast.error(error instanceof Error ? error.message : "Failed to send verification code")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !verificationCode) return

    setIsLoading(true)

    try {
      await verifyCode(email, verificationCode)
      toast.success("Welcome back!")
    } catch (error) {
      console.error('Verify code error:', error)
      toast.error(error instanceof Error ? error.message : "Invalid verification code")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    
    setGoogleStatus("🔄 Starting Google sign-in...")
    
    try {
      // Generate CSRF state token
      const state = crypto.randomUUID()
      sessionStorage.setItem('oauth_state', state)
      
      setGoogleStatus(`✅ State: ${state.substring(0, 8)}...`)
      
      // HARDCODE the production URL for now

      const webUrl = "https://dealer.universalautobrokers.net"
      // const webUrl = "http://localhost:3000"
      const ssoUrl = `${webUrl}/desktop-sso?state=${state}`
      
      setGoogleStatus(`🌐 Opening: ${ssoUrl}`)
      
      // Open in system browser using Tauri
      const { open } = await import('@tauri-apps/plugin-shell')
      await open(ssoUrl)
      
      setGoogleStatus("✅ Browser opened! Complete sign-in there...")
      
      // Show success message
      toast.success("Complete sign-in in your browser", { duration: 5000 })
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setGoogleStatus(`❌ Error: ${errorMsg}`)
      toast.error(`Failed to open browser: ${errorMsg}`)
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Google Sign-in Button with Status */}
      <div className="space-y-2">
        <Button
          onClick={handleGoogleSignIn}
          disabled={isLoading || step === "verify"}
          variant="secondary"
          className="w-full"
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
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
          {googleStatus && <ExternalLink className="ml-2 h-4 w-4" />}
        </Button>
        
        {/* Status Display */}
        {googleStatus && (
          <div className="p-3 bg-muted rounded-md border border-border">
            <p className="text-xs font-mono break-all">{googleStatus}</p>
          </div>
        )}
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-zinc-300 dark:border-zinc-600" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-zinc-50 dark:bg-zinc-900 px-2 text-zinc-500 dark:text-zinc-400">
            Or continue with email
          </span>
        </div>
      </div>

      {step === "email" ? (
        <form onSubmit={handleRequestCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-700 dark:text-zinc-200">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id={emailInputId}
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                className="bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-white pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              We'll send you a verification code to sign in
            </p>
          </div>

          <Button
            type="submit"
            disabled={isLoading || !email}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Send Verification Code"
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-zinc-700 dark:text-zinc-200">
              Email
            </Label>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md border">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{email}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep("email")
                  setVerificationCode("")
                  setDevCode(undefined)
                }}
                className="ml-auto"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Change
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="code" className="text-zinc-700 dark:text-zinc-200">
              Verification Code
            </Label>
            <Input
              id={codeInputId}
              type="text"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              disabled={isLoading}
              required
              maxLength={6}
              className="bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-white text-center text-lg tracking-widest"
            />
            {devCode && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Development code: {devCode}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Check your email for the verification code
            </p>
          </div>

          <Button
            type="submit"
            disabled={isLoading || verificationCode.length !== 6}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Verify & Sign In"
            )}
          </Button>

          <Button
            type="button"
            variant="link"
            size="sm"
            className="w-full"
            onClick={handleRequestCode}
            disabled={isLoading}
          >
            Didn't receive code? Resend
          </Button>
        </form>
      )}

      <div className="text-center text-xs text-muted-foreground space-y-1">
        App Version v2.0 (Email Auth)
      </div>
    </div>
  )
}