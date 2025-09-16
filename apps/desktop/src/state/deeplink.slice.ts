// src/state/deeplink.slice.ts
import { Store } from '@tanstack/react-store'

interface DeepLinkState {
  pendingLink: {
    dealId: string
    token: string
  } | null
  receivedAt: number | null
  isExchanging: boolean
  error: string | null
}

export const deepLinkStore = new Store<DeepLinkState>({
  pendingLink: null,
  receivedAt: null,
  isExchanging: false,
  error: null
})

export function clearPendingLink() {
  deepLinkStore.setState(() => ({
    pendingLink: null,
    receivedAt: null,
    isExchanging: false,
    error: null
  }))
}

export function setExchanging(isExchanging: boolean) {
  deepLinkStore.setState((state) => ({
    ...state,
    isExchanging
  }))
}

export function setError(error: string | null) {
  deepLinkStore.setState((state) => ({
    ...state,
    error,
    isExchanging: false
  }))
}