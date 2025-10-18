// src/components/AuthDiagnostic.tsx - Add this to your login page temporarily

import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function AuthDiagnostic() {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  const addLog = useCallback((msg: string, isError = false) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMsg = `[${timestamp}] ${msg}`;
    setLogs(prev => [...prev, logMsg]);
    if (isError) {
      console.error(logMsg);
    } else {
      console.log(logMsg);
    }
  }, []);

  const runDiagnostics = useCallback(async () => {
    addLog('🔍 Starting diagnostics...');

    // Check 1: Convex URL
    const convexUrl = import.meta.env.VITE_CONVEX_URL;
    const hasConvex = !!convexUrl;
    setChecks(prev => ({ ...prev, convexUrl: hasConvex }));
    if (hasConvex) {
      addLog(`✅ Convex URL found: ${convexUrl}`);
    } else {
      addLog('❌ VITE_CONVEX_URL not set in environment!', true);
      addLog('   Add to .env: VITE_CONVEX_URL=https://your-deployment.convex.cloud', true);
    }

    // Check 2: Window object
    const hasWindow = typeof window !== 'undefined';
    setChecks(prev => ({ ...prev, window: hasWindow }));
    addLog(hasWindow ? '✅ Window object exists' : '❌ Window object missing', !hasWindow);

    // Check 3: Event system
    let eventWorks = false;
    const testHandler = () => {
      eventWorks = true;
      addLog('✅ Event system working');
    };
    window.addEventListener('test-diagnostic', testHandler);
    window.dispatchEvent(new Event('test-diagnostic'));
    window.removeEventListener('test-diagnostic', testHandler);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    setChecks(prev => ({ ...prev, events: eventWorks }));
    if (!eventWorks) {
      addLog('❌ Event system not working!', true);
    }

    // Check 4: Tauri invoke (test with retrieve_secure which should always work)
    try {
      // Try to retrieve a non-existent key - should return null, not throw
      const result = await invoke('retrieve_secure', { key: 'diagnostic_test_key' });
      setChecks(prev => ({ ...prev, tauri: true }));
      addLog('✅ Tauri commands working');
      return result;
    } catch (err) {
      setChecks(prev => ({ ...prev, tauri: false }));
      addLog('❌ Tauri commands failed: ' + err, true);
    }

    // Check 5: Keyring
    try {
      const testToken = 'test_diagnostic_' + Date.now();
      await invoke('store_secure', { key: 'dealer_auth_token', value: testToken });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const retrieved = await invoke<string | null>('retrieve_secure', { key: 'dealer_auth_token' });
      
      if (retrieved === testToken) {
        setChecks(prev => ({ ...prev, keyring: true }));
        addLog('✅ Keyring storage working');
        await invoke('remove_secure', { key: 'dealer_auth_token' });
      } else {
        setChecks(prev => ({ ...prev, keyring: false }));
        addLog('❌ Keyring verification failed', true);
      }
    } catch (err) {
      setChecks(prev => ({ ...prev, keyring: false }));
      addLog('❌ Keyring error: ' + err, true);
    }

    // Check 6: SessionStorage
    try {
      sessionStorage.setItem('test', 'value');
      const val = sessionStorage.getItem('test');
      sessionStorage.removeItem('test');
      setChecks(prev => ({ ...prev, sessionStorage: val === 'value' }));
      addLog(val === 'value' ? '✅ SessionStorage working' : '❌ SessionStorage failed', val !== 'value');
    } catch (err) {
      setChecks(prev => ({ ...prev, sessionStorage: false }));
      addLog('❌ SessionStorage error: ' + err, true);
    }

    addLog('🏁 Diagnostics complete');
  }, [addLog]);

  const testDeepLink = () => {
    addLog('📤 Dispatching mock deep link event...');
    const mockUrl = 'dealer-sign://auth/callback?token=mock_jwt_token&state=mock_state';
    
    // Simulate what Tauri does
    const event = new CustomEvent('deep-link', {
      detail: mockUrl
    });
    
    window.dispatchEvent(event);
    addLog('✅ Mock deep link dispatched');
  };

  useEffect(() => {
    runDiagnostics();
  }, [runDiagnostics]);

  const testAuthCallback = () => {
    addLog('📤 Dispatching mock auth callback...');
    
    // Set a mock state first
    sessionStorage.setItem('oauth_state', 'mock_state_123');
    
    const event = new CustomEvent('auth-callback', {
      detail: {
        token: 'mock_jwt_token_abc123',
        state: 'mock_state_123'
      }
    });
    
    window.dispatchEvent(event);
    addLog('✅ Mock auth callback dispatched');
  };

  const allPassed = Object.values(checks).every(v => v === true);
  const criticalFailed = !checks.convexUrl || !checks.tauri || !checks.keyring;

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/80 z-50 overflow-auto p-4">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-lg shadow-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">🔍 Authentication Diagnostics</h2>
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded"
          >
            Close
          </button>
        </div>

        {/* Status Summary */}
        <div className={`p-4 rounded-lg mb-6 ${
          allPassed ? 'bg-green-100 dark:bg-green-900/30 border-green-500' :
          criticalFailed ? 'bg-red-100 dark:bg-red-900/30 border-red-500' :
          'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500'
        } border-2`}>
          <h3 className="font-bold text-lg mb-2">
            {allPassed ? '✅ All Systems Ready' :
             criticalFailed ? '❌ Critical Issues Detected' :
             '⚠️ Some Issues Detected'}
          </h3>
          <p className="text-sm">
            {allPassed ? 'Everything looks good! You should be able to authenticate.' :
             criticalFailed ? 'Critical systems are not working. Fix these before proceeding.' :
             'Some non-critical issues found. Authentication might work but with issues.'}
          </p>
        </div>

        {/* Checks */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {Object.entries(checks).map(([key, passed]) => (
            <div
              key={key}
              className={`p-3 rounded border-2 ${
                passed ? 'bg-green-50 dark:bg-green-900/20 border-green-500' :
                'bg-red-50 dark:bg-red-900/20 border-red-500'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{passed ? '✅' : '❌'}</span>
                <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Test Buttons */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            type="button"
            onClick={runDiagnostics}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
          >
            🔄 Re-run Diagnostics
          </button>
          <button
            type="button"
            onClick={testDeepLink}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium"
          >
            🔗 Test Deep Link
          </button>
          <button
            type="button"
            onClick={testAuthCallback}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium"
          >
            🔐 Test Auth Callback
          </button>
        </div>

        {/* Logs */}
        <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs max-h-96 overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-white">Console Logs:</span>
            <button
              type="button"
              onClick={() => setLogs([])}
              className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              Clear
            </button>
          </div>
          {logs.length === 0 ? (
            <div className="text-gray-500">No logs yet...</div>
          ) : (
            logs.map((log) => (
              <div key={log} className="mb-1 whitespace-pre-wrap">
                {log}
              </div>
            ))
          )}
        </div>

        {/* Instructions */}
        {criticalFailed && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded">
            <h4 className="font-bold text-red-900 dark:text-red-100 mb-2">🚨 Action Required:</h4>
            <ul className="text-sm space-y-2 text-red-800 dark:text-red-200">
              {!checks.convexUrl && (
                <li>• Add <code className="bg-red-200 dark:bg-red-800 px-1 rounded">VITE_CONVEX_URL</code> to your .env file</li>
              )}
              {!checks.tauri && (
                <li>• Tauri commands not working - check if running in Tauri environment</li>
              )}
              {!checks.keyring && (
                <li>• Keyring storage failed - check security.rs implementation</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}