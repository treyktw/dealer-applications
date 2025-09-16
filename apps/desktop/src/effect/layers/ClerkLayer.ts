// src/effect/layers/ClerkLayer.ts
import { Effect, Layer, pipe } from 'effect'
import { AuthService, AuthError, SessionExpiredError, SessionInfo } from '../domain/Auth'

export const ClerkAuthLayer = Layer.succeed(
  AuthService,
  AuthService.of({
    getToken: (options) =>
      Effect.tryPromise({
        try: async () => {
          const { getToken } = await import('@clerk/clerk-react').then(m => m.useAuth())
          const token = await getToken({ 
            skipCache: options?.skipCache,
            template: 'convex' // or your template name
          })
          
          if (!token) {
            throw new Error('No token available')
          }
          
          return token
        },
        catch: (error) =>
          new AuthError({
            message: `Failed to get token: ${error}`,
            code: 'TOKEN_FETCH_ERROR'
          })
      }),

    validateSession: () =>
      Effect.tryPromise({
        try: async () => {
          const { isSignedIn } = await import('@clerk/clerk-react').then(m => m.useAuth())
          return isSignedIn ?? false
        },
        catch: (error) =>
          new AuthError({
            message: `Session validation failed: ${error}`,
            code: 'SESSION_VALIDATION_ERROR'
          })
      }),

    requireStepUp: () =>
      pipe(
        Effect.tryPromise({
          try: async () => {
            const { getToken } = await import('@clerk/clerk-react').then(m => m.useAuth())
            
            // Get fresh token with max age of 2 minutes
            const token = await getToken({ 
              skipCache: true,
              template: 'step_up' // Configure this in Clerk dashboard
            })
            
            if (!token) {
              throw new Error('Step-up authentication required')
            }
            
            // Verify token age
            const payload = JSON.parse(atob(token.split('.')[1]))
            const age = Date.now() / 1000 - payload.iat
            
            if (age > 120) { // 2 minutes
              throw new Error('Token too old for step-up')
            }
            
            return token
          },
          catch: (error) => {
            if (error instanceof Error && error.message.includes('too old')) {
              return new SessionExpiredError({
                message: 'Step-up token expired'
              })
            }
            return new AuthError({
              message: `Step-up failed: ${error}`,
              code: 'STEP_UP_ERROR'
            })
          }
        })
      ),

    getSessionInfo: () =>
      Effect.tryPromise({
        try: async () => {
          const { userId, sessionId, orgRole } = await import('@clerk/clerk-react').then(m => m.useAuth())
          const { user } = await import('@clerk/clerk-react').then(m => m.useUser())
          
          if (!userId || !sessionId || !user) {
            throw new Error('No active session')
          }
          
          return {
            userId,
            email: user.primaryEmailAddress?.emailAddress || '',
            dealershipId: user.publicMetadata?.dealershipId as string | undefined,
            role: orgRole || user.publicMetadata?.role as string || 'user',
            permissions: user.publicMetadata?.permissions as string[] || [],
            sessionId,
            expiresAt: Date.now() + 3600000 // 1 hour
          } satisfies SessionInfo
        },
        catch: (error) =>
          new AuthError({
            message: `Failed to get session info: ${error}`,
            code: 'SESSION_INFO_ERROR'
          })
      })
  })
)