// src/lib/deeplink-listener.ts - Safe version with fallback logging
import { listen } from '@tauri-apps/api/event';

// Safe logging that falls back to console if addAuthLog isn't available
let addAuthLog: (message: string, level?: 'info' | 'success' | 'warning' | 'error') => void;

try {
  // Try to import from login page
  const loginModule = await import('@/routes/login');
  addAuthLog = loginModule.addAuthLog;
  console.log('✅ Using addAuthLog from login page');
} catch (error) {
  console.warn('⚠️  addAuthLog not available, using console fallback', error);
  // Fallback to console with colored output
  addAuthLog = (message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    console.log(`${emoji[level]} ${message}`);
  };
}

export async function setupDeepLinkListener() {
  addAuthLog('═══ Deep Link Listener Setup ═══', 'info');
  addAuthLog('🔗 Registering Tauri deep link event listener...', 'info');
  addAuthLog('   Event name: "deep-link"', 'info');
  
  try {
    const unlisten = await listen<string>('deep-link', (event) => {
      addAuthLog('═══════════════════════════════════', 'success');
      addAuthLog('🔗 DEEP LINK EVENT RECEIVED FROM TAURI!', 'success');
      addAuthLog('═══════════════════════════════════', 'success');
      addAuthLog(`📦 Raw payload: ${event.payload}`, 'info');
      addAuthLog(`📦 Event type: ${typeof event.payload}`, 'info');
      addAuthLog(`📦 Payload length: ${event.payload.length}`, 'info');
      
      try {
        // Parse the deep link URL
        addAuthLog('🔍 Attempting to parse URL...', 'info');
        const url = new URL(event.payload.replace('dealer-sign://', 'http://localhost/'));
        
        addAuthLog(`✅ URL parsed successfully`, 'success');
        addAuthLog(`   Protocol: ${url.protocol}`, 'info');
        addAuthLog(`   Hostname: ${url.hostname}`, 'info');
        addAuthLog(`   Pathname: ${url.pathname}`, 'info');
        addAuthLog(`   Search: ${url.search}`, 'info');
        
        // Handle auth callback from web
        if (url.pathname.includes('auth/callback')) {
          addAuthLog('═══ AUTH CALLBACK DETECTED ═══', 'success');
          addAuthLog('🔐 This is an authentication callback!', 'success');
          
          const token = url.searchParams.get('token');
          const state = url.searchParams.get('state');
          
          addAuthLog(`📊 Token present: ${!!token}`, token ? 'success' : 'error');
          addAuthLog(`📊 State present: ${!!state}`, state ? 'success' : 'error');
          
          if (token) {
            addAuthLog(`   Token length: ${token.length}`, 'info');
            addAuthLog(`   Token preview: ${token.substring(0, 30)}...`, 'info');
          } else {
            addAuthLog('   ❌ TOKEN IS NULL OR UNDEFINED!', 'error');
          }
          
          if (state) {
            addAuthLog(`   State length: ${state.length}`, 'info');
            addAuthLog(`   State preview: ${state.substring(0, 20)}...`, 'info');
          } else {
            addAuthLog('   ❌ STATE IS NULL OR UNDEFINED!', 'error');
          }
          
          if (!token) {
            addAuthLog('❌ ABORTING: No token parameter in auth callback!', 'error');
            window.dispatchEvent(new CustomEvent('auth-callback-error', {
              detail: { error: 'No token received from authentication' }
            }));
            return;
          }
          
          if (!state) {
            addAuthLog('❌ ABORTING: No state parameter in auth callback!', 'error');
            window.dispatchEvent(new CustomEvent('auth-callback-error', {
              detail: { error: 'Invalid authentication response (no state)' }
            }));
            return;
          }
          
          // Both token and state are present - dispatch to React
          addAuthLog('═══ DISPATCHING TO REACT ═══', 'info');
          addAuthLog('📤 Creating CustomEvent "auth-callback"...', 'info');
          addAuthLog(`   Detail: { token: "${token.substring(0, 20)}...", state: "${state.substring(0, 10)}..." }`, 'info');
          
          const authEvent = new CustomEvent('auth-callback', {
            detail: { token, state }
          });
          
          addAuthLog('📤 Dispatching event to window...', 'info');
          window.dispatchEvent(authEvent);
          
          addAuthLog('✅ Auth callback event dispatched successfully!', 'success');
          addAuthLog('   React AuthContext should receive this now', 'info');
          return;
        }
        
        // Handle deal deep links (existing functionality)
        if (url.pathname.includes('open')) {
          addAuthLog('📄 Deal deep link detected', 'info');
          
          const dealId = url.searchParams.get('dealId');
          const token = url.searchParams.get('token');
          
          if (dealId && token) {
            addAuthLog(`   Deal ID: ${dealId}`, 'info');
            const dealUrl = `/deals/${dealId}?token=${encodeURIComponent(token)}`;
            
            try {
              window.location.href = dealUrl;
              addAuthLog('✅ Navigated to deal page', 'success');
            } catch (navError) {
              addAuthLog(`❌ Navigation failed: ${navError}`, 'error');
              window.history.pushState(null, '', dealUrl);
              window.location.reload();
            }
          } else {
            addAuthLog('⚠️  Deal deep link missing parameters', 'warning');
          }
          return;
        }
        
        addAuthLog('⚠️  Deep link pattern not recognized', 'warning');
        addAuthLog(`   Pathname was: ${url.pathname}`, 'info');
        addAuthLog(`   Expected patterns: "/auth/callback" or "/open"`, 'info');
        
      } catch (error) {
        addAuthLog(`❌ Failed to parse deep link URL`, 'error');
        addAuthLog(`   Error: ${error}`, 'error');
        addAuthLog(`   Error type: ${error instanceof Error ? error.constructor.name : typeof error}`, 'error');
        
        // Fallback: try to extract token from raw string for auth
        addAuthLog('🔄 Attempting fallback token extraction from raw string...', 'info');
        
        if (event.payload.includes('auth/callback')) {
          addAuthLog('   Payload contains "auth/callback", trying regex...', 'info');
          
          const tokenMatch = event.payload.match(/token=([^&]+)/);
          const stateMatch = event.payload.match(/state=([^&]+)/);
          
          addAuthLog(`   Token match: ${!!tokenMatch}`, 'info');
          addAuthLog(`   State match: ${!!stateMatch}`, 'info');
          
          if (tokenMatch && stateMatch) {
            const token = decodeURIComponent(tokenMatch[1]);
            const state = decodeURIComponent(stateMatch[1]);
            
            addAuthLog('✅ Extracted auth params from raw string', 'success');
            addAuthLog(`   Token: ${token.substring(0, 30)}...`, 'info');
            addAuthLog(`   State: ${state.substring(0, 20)}...`, 'info');
            
            window.dispatchEvent(new CustomEvent('auth-callback', {
              detail: { token, state }
            }));
            
            addAuthLog('✅ Fallback event dispatched', 'success');
          } else {
            addAuthLog('❌ Fallback extraction failed - no matches found', 'error');
            window.dispatchEvent(new CustomEvent('auth-callback-error', {
              detail: { error: 'Failed to parse authentication response' }
            }));
          }
        } else {
          addAuthLog('   Payload does not contain "auth/callback"', 'error');
        }
      }
    });

    addAuthLog('✅ Deep link listener registered successfully', 'success');
    addAuthLog('   Listening for event: "deep-link"', 'info');
    addAuthLog('   Ready to receive deep links from Tauri', 'success');
    
    return unlisten;
    
  } catch (error) {
    addAuthLog(`❌ Failed to setup deep link listener: ${error}`, 'error');
    throw error;
  }
}