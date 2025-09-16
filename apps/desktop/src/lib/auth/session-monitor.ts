// src/lib/auth/session-monitor.ts

export class SessionMonitor {
  private idleTimer?: NodeJS.Timeout
  private readonly IDLE_TIMEOUT = 15 * 60 * 1000 // 15 minutes
  private readonly WARNING_TIME = 2 * 60 * 1000 // 2 minute warning
  private lastActivity = Date.now()

  start(onTimeout: () => void, onWarning: () => void) {
    // Reset on any user activity
    const resetTimer = () => {
      this.lastActivity = Date.now()
      this.clearTimers()
      
      // Set warning timer
      this.idleTimer = setTimeout(() => {
        onWarning()
        
        // Set final timeout
        this.idleTimer = setTimeout(() => {
          onTimeout()
        }, this.WARNING_TIME)
      }, this.IDLE_TIMEOUT - this.WARNING_TIME)
    }

    // Monitor user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => {
      document.addEventListener(event, resetTimer)
    })

    // Start initial timer
    resetTimer()

    // Return cleanup function
    return () => {
      this.clearTimers()
      events.forEach(event => {
        document.removeEventListener(event, resetTimer)
      })
    }
  }

  private clearTimers() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
    }
  }

  getIdleTime(): number {
    return Date.now() - this.lastActivity
  }
}