// src/components/AuthDebug.tsx - Temporary Debug Component
import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';

export function AuthDebug() {
  const [token, setToken] = useState<string>('');
  const [storedToken, setStoredToken] = useState<string>('');
  
  const testStore = async () => {
    try {
      const testToken = 'test_token_' + Date.now();
      console.log('Storing test token:', testToken);
      await invoke('store_secure', { 
        key: 'dealer_auth_token', 
        value: testToken 
      });
      setToken(testToken);
      alert('Token stored!');
    } catch (error) {
      console.error('Store failed:', error);
      alert('Store failed: ' + error);
    }
  };
  
  const testRetrieve = async () => {
    try {
      console.log('Retrieving token...');
      const retrieved = await invoke<string | null>('retrieve_secure', { 
        key: 'dealer_auth_token' 
      });
      console.log('Retrieved token:', retrieved);
      setStoredToken(retrieved || 'null');
      alert('Retrieved: ' + (retrieved || 'null'));
    } catch (error) {
      console.error('Retrieve failed:', error);
      alert('Retrieve failed: ' + error);
    }
  };
  
  const testRemove = async () => {
    try {
      console.log('Removing token...');
      await invoke('remove_secure', { 
        key: 'dealer_auth_token' 
      });
      alert('Token removed!');
      setStoredToken('');
    } catch (error) {
      console.error('Remove failed:', error);
      alert('Remove failed: ' + error);
    }
  };
  
  return (
    <div className="fixed top-2.5 right-2.5 bg-gray-500 border-2 border-red-500 p-5 z-[9999] max-w-xs">
      <h3 className="m-0 mb-2.5">🔧 Token Debug</h3>
      
      <div className="mb-2.5">
        <button 
          type="button" 
          onClick={testStore} 
          className="mr-1.5 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          Store Test Token
        </button>
      </div>
      
      <div className="mb-2.5">
        <button 
          type="button" 
          onClick={testRetrieve} 
          className="mr-1.5 px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
        >
          Retrieve Token
        </button>
      </div>
      
      <div className="mb-2.5">
        <button 
          type="button" 
          onClick={testRemove}
          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
        >
          Remove Token
        </button>
      </div>
      
      {token && (
        <div className="text-xs mt-2.5 break-all bg-gray-900 text-black p-1.5 rounded">
          <strong>Stored:</strong> {token}
        </div>
      )}
      
      {storedToken && (
        <div className="text-xs mt-2.5 break-all bg-gray-100 text-black p-1.5 rounded">
          <strong>Retrieved:</strong> {storedToken}
        </div>
      )}
      
      <div className="mt-2.5 text-xs text-gray-600">
        Check console for logs
      </div>
    </div>
  );
}