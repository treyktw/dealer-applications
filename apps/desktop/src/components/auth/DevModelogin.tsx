// src/components/auth/DevModeLogin.tsx - Development login bypass
import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthContext';

export function DevModeLogin() {
  const [jwt, setJwt] = useState('');
  const { handleAuthCallback } = useAuth();
  
  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  const handleDevLogin = async () => {
    if (!jwt.trim()) {
      alert('Paste a JWT token first');
      return;
    }

    // Generate fake state
    const state = crypto.randomUUID();
    sessionStorage.setItem('oauth_state', state);

    // Simulate deep link callback
    await handleAuthCallback(jwt, state);
  };

  return (
    <div className="mt-8 p-4 border border-yellow-500 rounded-lg bg-yellow-50">
      <h3 className="text-sm font-bold text-yellow-800 mb-2">
        🛠️ DEV MODE ONLY
      </h3>
      <p className="text-xs text-yellow-700 mb-3">
        Deep links don't work in dev. Paste JWT from browser console:
      </p>
      
      <textarea
        value={jwt}
        onChange={(e) => setJwt(e.target.value)}
        placeholder="Paste JWT token here..."
        className="w-full h-24 p-2 border rounded text-xs font-mono mb-2"
      />
      
      <button
        type="button"
        onClick={handleDevLogin}
        className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded"
      >
        Dev Login
      </button>
      
      <details className="mt-3 text-xs text-yellow-700">
        <summary className="cursor-pointer font-semibold">
          How to get JWT token?
        </summary>
        <ol className="mt-2 ml-4 list-decimal space-y-1">
          <li>Click "Sign In" button above</li>
          <li>Complete auth in browser</li>
          <li>Open browser console (F12)</li>
          <li>Look for deep link URL in logs</li>
          <li>Copy the <code>token=</code> value</li>
          <li>Paste here and click "Dev Login"</li>
        </ol>
      </details>
    </div>
  );
}