import { listen } from '@tauri-apps/api/event'

export async function setupDeepLinkListener() {
  console.log('Setting up deep link listener...')
  
  // Listen for deep link events from Tauri
  const unlisten = await listen<string>('deep-link', (event) => {
    console.log('🔗 Deep link received:', event.payload)
    
    try {
      const url = new URL(event.payload)
      console.log('Protocol:', url.protocol)
      console.log('Pathname:', url.pathname)
      console.log('Search:', url.search)
      
      // Handle OAuth callback
      if (url.protocol === 'dealer-sign:' && url.pathname.includes('oauth/callback')) {
        const state = url.searchParams.get('state')
        console.log('OAuth callback detected, state:', state)
        
        if (!state) {
          console.error('No state parameter found in deep link')
          return
        }
        
        // Store the state for verification
        sessionStorage.setItem('oauth_state', state)
        
        // Navigate to callback route with parameters
        const callbackUrl = `/oauth-callback?state=${encodeURIComponent(state)}`
        console.log('Navigating to:', callbackUrl)
        
        // Use a more reliable navigation method
        try {
          window.location.href = callbackUrl
        } catch (navError) {
          console.error('Navigation failed, trying alternative method:', navError)
          // Fallback: try using history API
          window.history.pushState(null, '', callbackUrl)
          window.location.reload()
        }
      } else {
        console.log('Deep link not recognized as OAuth callback')
      }
    } catch (error) {
      console.error('Failed to parse deep link:', error)
      // Try to handle as a simple string if URL parsing fails
      if (event.payload.includes('oauth/callback')) {
        const stateMatch = event.payload.match(/state=([^&]+)/)
        if (stateMatch) {
          const state = stateMatch[1]
          console.log('Extracted state from string:', state)
          sessionStorage.setItem('oauth_state', state)
          window.location.href = `/oauth-callback?state=${encodeURIComponent(state)}`
        }
      }
    }
  })

  console.log('Deep link listener registered')
  return unlisten
}