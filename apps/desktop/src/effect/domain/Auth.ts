// src/effect/domain/Auth.ts
import { Effect, Context } from 'effect'
import { TaggedError } from 'effect/Data'

export class AuthError extends TaggedError('AuthError')<{
  readonly message: string
  readonly code?: string
}> {}

export class SessionExpiredError extends TaggedError('SessionExpiredError')<{
  readonly message: string
}> {}

export interface AuthService {
  readonly getToken: (options?: { skipCache?: boolean }) => Effect.Effect<string, AuthError>
  readonly validateSession: () => Effect.Effect<boolean, AuthError>
  readonly requireStepUp: () => Effect.Effect<string, AuthError | SessionExpiredError>
  readonly getSessionInfo: () => Effect.Effect<SessionInfo, AuthError>
}

export interface SessionInfo {
  userId: string
  email: string
  dealershipId?: string
  role: string
  permissions: string[]
  sessionId: string
  expiresAt: number
}

export const AuthService = Context.GenericTag<AuthService>('AuthService')