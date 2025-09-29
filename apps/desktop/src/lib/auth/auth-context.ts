// src/lib/auth/auth-context.ts

export interface AuthContext {
  auth?: {
    isLoaded: boolean
    isSignedIn: boolean
    userId: string | null | undefined
  }
}