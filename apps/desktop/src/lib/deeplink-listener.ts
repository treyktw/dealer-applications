// src/lib/deeplink-listener.ts - Fixed Deep link handling for desktop app
import { listen } from '@tauri-apps/api/event';

/**
 * Setup deep link listener for desktop app
 * 
 * Handles:
 * - Auth callbacks from web
 * - Deal deep links (dealer-sign://open?dealId=xxx&token=xxx)
 * 
 * Fixed: Now navigates to deal page on FIRST open (not just second)
 */
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
        
        // Handle subscription success deep link
        if (url.pathname.includes('subscription-success')) {
          console.log('✅ Subscription success detected');
          
          const sessionId = url.searchParams.get('session_id');
          const email = url.searchParams.get('email');
          
          console.log('Subscription success params:', { sessionId, email });
          
          // Dispatch event for account setup
          window.dispatchEvent(new CustomEvent('subscription-success', {
            detail: { sessionId, email }
          }));
          return;
        }
        
        // Handle subscription canceled deep link
        if (url.pathname.includes('subscription-canceled')) {
          console.log('❌ Subscription canceled');
          
          window.dispatchEvent(new CustomEvent('subscription-canceled', {
            detail: {}
          }));
          return;
        }
        
        // Handle deal deep links (existing functionality)
        if (url.pathname.includes('open')) {
          console.log('📄 Deal deep link detected');
          
          const dealId = url.searchParams.get('dealId');
          const token = url.searchParams.get('token');
          
          if (dealId && token) {
            console.log('Deal ID:', dealId, 'Token:', token.substring(0, 10) + '...');
            
            // ⚠️ FIX: Use proper router navigation
            const dealUrl = `/deals/${dealId}/documents?token=${encodeURIComponent(token)}`;
            
            // Try multiple navigation methods to ensure it works
            try {
              // Method 1: Check if router is available
              if (typeof window !== 'undefined' && (window as any).__router) {
                console.log('✅ Using router navigation');
                (window as any).__router.navigate({ 
                  to: '/deals/$dealsId/documents',
                  params: { dealsId: dealId },
                  search: { token }
                });
              } 
              // Method 2: Use window.location with hash for SPA
              else if (window.location.hash) {
                console.log('✅ Using hash navigation');
                window.location.hash = dealUrl;
              }
              // Method 3: Direct navigation (fallback)
              else {
                console.log('✅ Using direct navigation');
                window.history.pushState({ dealId, token }, '', dealUrl);
                
                // Dispatch custom event that App.tsx can listen for
                window.dispatchEvent(new CustomEvent('navigate-to-deal', {
                  detail: { dealId, token, url: dealUrl }
                }));
                
                // Force reload if nothing else works
                setTimeout(() => {
                  if (window.location.pathname === '/') {
                    console.log('🔄 Forcing navigation...');
                    window.location.href = dealUrl;
                  }
                }, 100);
              }
              
              console.log('✅ Navigated to deal page:', dealUrl);
            } catch (navError) {
              console.error('❌ Navigation failed:', navError);
              
              // Last resort: full reload to the URL
              console.log('🔄 Using fallback: full page load');
              window.location.href = dealUrl;
            }
          } else {
            console.warn('⚠️ Deal deep link missing parameters');
            console.log('Received:', { dealId, token });
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

/**
 * Helper: Expose router to window for deep link navigation
 * Call this from your App.tsx or router setup
 */
export function exposeRouterForDeepLinks(router: any) {
  if (typeof window !== 'undefined') {
    (window as any).__router = router;
    console.log('✅ Router exposed for deep link navigation');
  }
}