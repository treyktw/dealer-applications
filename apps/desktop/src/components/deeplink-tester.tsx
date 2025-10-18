// src/components/DeepLinkTester.tsx - Manual Deep Link Testing
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { addAuthLog } from '@/routes/login';

export function DeepLinkTester() {
  const [testToken, setTestToken] = useState('');
  const [testState, setTestState] = useState('');

  const generateTestData = () => {
    const state = crypto.randomUUID();
    const token = 'test_jwt_' + crypto.randomUUID() + '_' + Date.now();
    
    setTestState(state);
    setTestToken(token);
    
    // Store state in sessionStorage like the real flow does
    sessionStorage.setItem('oauth_state', state);
    
    addAuthLog('🧪 Generated test data', 'info');
    addAuthLog(`   State: ${state}`, 'info');
    addAuthLog(`   Token: ${token.substring(0, 40)}...`, 'info');
  };

  const testDispatchEvent = () => {
    if (!testToken || !testState) {
      addAuthLog('❌ Generate test data first!', 'error');
      return;
    }

    addAuthLog('═══ MANUAL EVENT DISPATCH TEST ═══', 'info');
    addAuthLog('📤 Dispatching auth-callback event...', 'info');
    
    window.dispatchEvent(new CustomEvent('auth-callback', {
      detail: {
        token: testToken,
        state: testState
      }
    }));
    
    addAuthLog('✅ Event dispatched - check logs above for response', 'success');
  };

  const testDeepLink = async () => {
    if (!testToken || !testState) {
      addAuthLog('❌ Generate test data first!', 'error');
      return;
    }

    addAuthLog('═══ MANUAL DEEP LINK TEST ═══', 'info');
    
    const deepLinkUrl = `dealer-sign://auth/callback?token=${encodeURIComponent(testToken)}&state=${encodeURIComponent(testState)}`;
    
    addAuthLog(`🔗 Deep link URL: ${deepLinkUrl.substring(0, 100)}...`, 'info');
    addAuthLog('📱 Attempting to trigger deep link...', 'info');
    addAuthLog('   (This should open the app if protocol is registered)', 'info');
    
    try {
      // Try to open the deep link
      window.location.href = deepLinkUrl;
      addAuthLog('✅ Deep link triggered', 'success');
    } catch (error) {
      addAuthLog(`❌ Deep link failed: ${error}`, 'error');
    }
  };

  const checkSessionStorage = () => {
    addAuthLog('═══ SESSION STORAGE CHECK ═══', 'info');
    
    const storedState = sessionStorage.getItem('oauth_state');
    addAuthLog(`Stored state: ${storedState || 'null'}`, storedState ? 'success' : 'warning');
    
    if (testState && storedState !== testState) {
      addAuthLog('⚠️ State mismatch!', 'warning');
      addAuthLog(`   Expected: ${testState}`, 'info');
      addAuthLog(`   Got: ${storedState}`, 'info');
    }
  };

  const testWindowEvents = () => {
    addAuthLog('═══ WINDOW EVENTS TEST ═══', 'info');
    
    let received = false;
    
    const handler = () => {
      received = true;
      addAuthLog('✅ Test event received!', 'success');
    };
    
    window.addEventListener('test-event-123', handler);
    addAuthLog('🎧 Listener added for test-event-123', 'info');
    
    addAuthLog('📤 Dispatching test-event-123...', 'info');
    window.dispatchEvent(new CustomEvent('test-event-123', { detail: 'hello' }));
    
    setTimeout(() => {
      window.removeEventListener('test-event-123', handler);
      
      if (received) {
        addAuthLog('✅ Event system working correctly', 'success');
      } else {
        addAuthLog('❌ Event system NOT working!', 'error',);
      }
    }, 100);
  };

  return (
    <Card className="border-2 border-yellow-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🧪 Deep Link Tester
          <span className="text-sm font-normal text-muted-foreground">
            (Debug Tool)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            This tool helps test the deep link flow without needing the web browser.
          </p>
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={generateTestData}
              variant="outline"
              size="sm"
              className="w-full"
            >
              1. Generate Test Data
            </Button>
            
            <Button
              onClick={checkSessionStorage}
              variant="outline"
              size="sm"
              className="w-full"
            >
              2. Check SessionStorage
            </Button>
            
            <Button
              onClick={testWindowEvents}
              variant="outline"
              size="sm"
              className="w-full"
            >
              3. Test Events
            </Button>
            
            <Button
              onClick={testDispatchEvent}
              variant="outline"
              size="sm"
              className="w-full"
              disabled={!testToken}
            >
              4. Test Dispatch
            </Button>
            
            <Button
              onClick={testDeepLink}
              variant="secondary"
              size="sm"
              className="w-full col-span-2"
              disabled={!testToken}
            >
              5. Test Deep Link (opens app)
            </Button>
          </div>
        </div>

        {testToken && (
          <div className="p-3 bg-muted rounded text-xs font-mono space-y-1">
            <div className="text-muted-foreground">Generated Test Data:</div>
            <div className="break-all">
              <span className="text-blue-600">State:</span> {testState.substring(0, 20)}...
            </div>
            <div className="break-all">
              <span className="text-green-600">Token:</span> {testToken.substring(0, 40)}...
            </div>
          </div>
        )}

        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded text-xs">
          <p className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
            How to use:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-yellow-800 dark:text-yellow-200">
            <li>Click "Generate Test Data" first</li>
            <li>Click "Test Dispatch" to simulate the callback</li>
            <li>Check the logs to see if AuthContext responds</li>
            <li>If that works, try "Test Deep Link"</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}