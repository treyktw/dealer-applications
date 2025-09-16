// src/effect/domain/DeepLink.ts
import { Effect, Context, pipe } from 'effect'
import { TaggedError } from 'effect/Data'
import { AuthService } from './Auth'
import { toast } from 'sonner'

export class DeepLinkError extends TaggedError('DeepLinkError')<{
  readonly message: string
  readonly code?: string
}> {}

export class DeepLinkExpiredError extends TaggedError('DeepLinkExpiredError')<{
  readonly message: string
}> {}

export interface DeepLinkService {
  readonly exchange: (params: {
    dealId: string
    token: string
  }) => Effect.Effect<DeepLinkResult, DeepLinkError | DeepLinkExpiredError>
  
  readonly validate: (token: string) => Effect.Effect<boolean, DeepLinkError>
}

export interface DeepLinkResult {
  dealId: string
  dealershipId: string
  success: boolean
  authToken?: string
}

export const DeepLinkService = Context.GenericTag<DeepLinkService>('DeepLinkService')

// Exchange implementation
export const exchangeDeepLink = (dealId: string, token: string) =>
  pipe(
    Effect.gen(function* (_) {
      const authService = yield* _(AuthService)
      const deepLinkService = yield* _(DeepLinkService)
      
      // First, ensure we have a valid session
      const isValid = yield* _(authService.validateSession())
      if (!isValid) {
        return yield* _(Effect.fail(
          new DeepLinkError({ 
            message: 'No active session',
            code: 'NO_SESSION'
          })
        ))
      }
      
      // Get auth token for the exchange
      const authToken = yield* _(authService.getToken())
      
      // Exchange the deep link token
      const result = yield* _(deepLinkService.exchange({ 
        dealId, 
        token 
      }))
      
      // Return result with auth token for verification
      return {
        ...result,
        authToken
      }
    }),
    Effect.catchTags({
      DeepLinkExpiredError: (error) => {
        toast("Deep link has expired. Please request a new one. Contact your administrator if you believe this is an error: " + error.message, {
          action: {
            label: "Request new link",
            onClick: () => console.log("Request new link"),
          },
        })
        return Effect.succeed({
          dealId: '',
          dealershipId: '',
          success: false
        })
      },
      AuthError: (error) => {
        toast(`Authentication failed: ${error.message}`)
        return Effect.fail(
          new DeepLinkError({
            message: `Auth failed during exchange: ${error.message}`,
            code: 'AUTH_ERROR'
          })
        )
      },
      DeepLinkError: (error) => {
        toast(error.message)
        return Effect.fail(error)
      }
    })
  )