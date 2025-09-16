// src/deeplink/listener.ts
import { listen } from '@tauri-apps/api/event'
import { deepLinkStore } from '@/state/deeplink.slice'

interface DeepLinkState {
  pendingLink: {
    dealId: string
    token: string
  } | null
  receivedAt: number | null
  isExchanging: boolean
  error: string | null
}

export class DeepLinkListener {
  private unlisten?: () => void

  async start() {
    try {
      // Listen for deep-link events from Tauri
      this.unlisten = await listen<string>('deep-link', (event) => {
        console.log('Deep link received:', event.payload)
        this.handleDeepLink(event.payload)
      })
      
      console.log('Deep link listener started')
    } catch (error) {
      console.error('Failed to start deep link listener:', error)
    }
  }

  stop() {
    if (this.unlisten) {
      this.unlisten()
      console.log('Deep link listener stopped')
    }
  }

  private handleDeepLink(url: string) {
    try {
      const parsed = new URL(url)
      
      if (parsed.protocol !== 'dealer-sign:') {
        console.warn('Invalid protocol:', parsed.protocol)
        return
      }

      const dealId = parsed.searchParams.get('dealId')
      const token = parsed.searchParams.get('token')
      
      if (!dealId || !token) {
        console.warn('Missing required parameters in deep link')
        return
      }

      // Store in state for later exchange
      deepLinkStore.setState((state: DeepLinkState) => ({
        ...state,
        pendingLink: { dealId, token },
        receivedAt: Date.now()
      }))

      console.log('Deep link stored for processing:', { dealId })
    } catch (error) {
      console.error('Failed to parse deep link:', error)
    }
  }
}