// src/lib/deeplink-listener.ts - Deep link handling for desktop app
import { listen } from '@tauri-apps/api/event';

export async function setupDeepLinkListener() {
  console.log('🔗 Setting up deep link listener...');
  
  try {
    const unlisten = await listen<string>('deep-link', (event) => {
      console.log('🔗 Deep link received:', event.payload);
      
      try {
        // Parse the deep link URL
        const url = new URL(event.payload.replace('dealer-sign://', 'http://localhost/'));
        console.log('✅ URL parsed:', url.pathname, url.search);
        
        // Handle auth callback from web
        if (url.pathname.includes('auth/callback')) {
          console.log('🔐 Auth callback detected');
          
          const token = url.searchParams.get('token');
          const state = url.searchParams.get('state');
          
          if (!token) {
            console.error('❌ No token in auth callback');
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
          
          console.log('✅ Dispatching auth callback event');
          window.dispatchEvent(new CustomEvent('auth-callback', {
            detail: { token, state }
          }));
          return;
        }
        
        // Handle deal deep links (existing functionality)
        if (url.pathname.includes('open')) {
          console.log('📄 Deal deep link detected');
          
          const dealId = url.searchParams.get('dealId');
          const token = url.searchParams.get('token');
          
          if (dealId && token) {
            console.log('Deal ID:', dealId);
            const dealUrl = `/deals/${dealId}?token=${encodeURIComponent(token)}`;
            
            try {
              window.location.href = dealUrl;
              console.log('✅ Navigated to deal page');
            } catch (navError) {
              console.error('❌ Navigation failed:', navError);
              window.history.pushState(null, '', dealUrl);
              window.location.reload();
            }
          } else {
            console.warn('⚠️ Deal deep link missing parameters');
          }
          return;
        }
        
        console.warn('⚠️ Deep link pattern not recognized:', url.pathname);
        
      } catch (error) {
        console.error('❌ Failed to parse deep link URL:', error);
        
        // Fallback: try to extract token from raw string for auth
        if (event.payload.includes('auth/callback')) {
          console.log('🔄 Attempting fallback token extraction...');
          
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
            console.error('❌ Fallback extraction failed');
            window.dispatchEvent(new CustomEvent('auth-callback-error', {
              detail: { error: 'Failed to parse authentication response' }
            }));
          }
        }
      }
    });

    console.log('✅ Deep link listener registered successfully');
    return unlisten;
    
  } catch (error) {
    console.error('❌ Failed to setup deep link listener:', error);
    throw error;
  }
}