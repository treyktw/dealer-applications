// src/lib/deeplink-listener.ts - Updated for Desktop Auth with Clerk JWT
import { listen } from '@tauri-apps/api/event';

export async function setupDeepLinkListener() {
  console.log('🔗 Setting up deep link listener...');
  
  const unlisten = await listen<string>('deep-link', (event) => {
    console.log('🔗 Deep link received:', event.payload);
    
    try {
      const url = new URL(event.payload.replace('dealer-sign://', 'http://localhost/'));
      console.log('Protocol:', url.protocol);
      console.log('Pathname:', url.pathname);
      console.log('Search:', url.search);
      
      // Handle auth callback from web (NEW)
      if (url.pathname.includes('auth/callback')) {
        const token = url.searchParams.get('token');
        const state = url.searchParams.get('state');
        
        console.log('🔐 Auth callback detected');
        console.log('  Token:', token ? `${token.substring(0, 15)}...` : 'missing');
        console.log('  State:', state ? `${state.substring(0, 8)}...` : 'missing');
        
        if (!token) {
          console.error('❌ No token in auth callback');
          // Dispatch error event
          window.dispatchEvent(new CustomEvent('auth-callback-error', {
            detail: { error: 'No token received from authentication' }
          }));
          return;
        }
        
        if (!state) {
          console.error('❌ No state in auth callback');
          window.dispatchEvent(new CustomEvent('auth-callback-error', {
            detail: { error: 'Invalid authentication response (no state)' }
          }));
          return;
        }
        
        // Dispatch auth callback event to React app
        window.dispatchEvent(new CustomEvent('auth-callback', {
          detail: { token, state }
        }));
        
        console.log('✅ Auth callback event dispatched to React');
        return;
      }
      
      // Handle deal deep links (existing functionality)
      if (url.pathname.includes('open')) {
        const dealId = url.searchParams.get('dealId');
        const token = url.searchParams.get('token');
        
        if (dealId && token) {
          console.log('📄 Deal deep link detected:', dealId);
          const dealUrl = `/deals/${dealId}?token=${encodeURIComponent(token)}`;
          
          try {
            window.location.href = dealUrl;
            console.log('✅ Navigated to deal');
          } catch (navError) {
            console.error('❌ Navigation failed:', navError);
            window.history.pushState(null, '', dealUrl);
            window.location.reload();
          }
        } else {
          console.log('⚠️  Deal deep link missing parameters');
        }
        return;
      }
      
      console.log('⚠️  Deep link pattern not recognized');
    } catch (error) {
      console.error('❌ Failed to parse deep link:', error);
      
      // Fallback: try to extract token from raw string for auth
      if (event.payload.includes('auth/callback')) {
        const tokenMatch = event.payload.match(/token=([^&]+)/);
        const stateMatch = event.payload.match(/state=([^&]+)/);
        
        if (tokenMatch && stateMatch) {
          const token = decodeURIComponent(tokenMatch[1]);
          const state = decodeURIComponent(stateMatch[1]);
          
          console.log('✅ Extracted auth params from raw string');
          window.dispatchEvent(new CustomEvent('auth-callback', {
            detail: { token, state }
          }));
        } else {
          window.dispatchEvent(new CustomEvent('auth-callback-error', {
            detail: { error: 'Failed to parse authentication response' }
          }));
        }
      }
    }
  });

  console.log('✅ Deep link listener registered');
  return unlisten;
}