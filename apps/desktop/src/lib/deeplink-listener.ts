import { listen } from '@tauri-apps/api/event'

export async function setupDeepLinkListener() {
  // Listen for deep link events from Tauri
  const unlisten = await listen<string>('deep-link', (event) => {
    console.log('Deep link received:', event.payload)
    
    try {
      const url = new URL(event.payload)
      
      // Handle OAuth callback
      if (url.protocol === 'dealer-sign:' && url.pathname === '//oauth/callback') {
        const state = url.searchParams.get('state')
        
        // Navigate to callback route with parameters
        window.location.href = `/oauth-callback?state=${state}`
      }
    } catch (error) {
      console.error('Failed to parse deep link:', error)
    }
  })

  return unlisten
}