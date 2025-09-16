// src/lib/auth/rate-limiter.ts
interface AttemptRecord {
  count: number
  firstAttempt: number
  lockedUntil?: number
}

class RateLimiter {
  private attempts = new Map<string, AttemptRecord>()
  private readonly maxAttempts = 5
  private readonly lockoutDuration = 5 * 60 * 1000 // 5 minutes
  private readonly windowDuration = 15 * 60 * 1000 // 15 minute window

  recordAttempt(identifier: string): { allowed: boolean; remainingAttempts?: number; lockedUntil?: number } {
    const now = Date.now()
    const record = this.attempts.get(identifier)

    if (record?.lockedUntil && record.lockedUntil > now) {
      return { 
        allowed: false, 
        lockedUntil: record.lockedUntil 
      }
    }

    if (!record || now - record.firstAttempt > this.windowDuration) {
      this.attempts.set(identifier, {
        count: 1,
        firstAttempt: now
      })
      return { allowed: true, remainingAttempts: this.maxAttempts - 1 }
    }

    record.count++
    
    if (record.count >= this.maxAttempts) {
      record.lockedUntil = now + this.lockoutDuration
      return { 
        allowed: false, 
        lockedUntil: record.lockedUntil 
      }
    }

    return { 
      allowed: true, 
      remainingAttempts: this.maxAttempts - record.count 
    }
  }

  reset(identifier: string) {
    this.attempts.delete(identifier)
  }

  getRemainingLockTime(identifier: string): number {
    const record = this.attempts.get(identifier)
    if (!record?.lockedUntil) return 0
    
    const remaining = record.lockedUntil - Date.now()
    return remaining > 0 ? remaining : 0
  }
}

export const rateLimiter = new RateLimiter()