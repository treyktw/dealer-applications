// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Global error handlers to prevent crashes
window.addEventListener('error', (event) => {
  console.error('❌ [GLOBAL] Unhandled error:', event.error);
  console.error('❌ [GLOBAL] Error message:', event.message);
  console.error('❌ [GLOBAL] Error source:', event.filename, ':', event.lineno);
  // Prevent default browser error handling
  event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ [GLOBAL] Unhandled promise rejection:', event.reason);
  if (event.reason instanceof Error) {
    console.error('❌ [GLOBAL] Error stack:', event.reason.stack);
  }
  // Prevent default browser error handling
  event.preventDefault();
});

// Freeze detection - log if main thread is blocked
let lastHeartbeat = Date.now();
setInterval(() => {
  const now = Date.now();
  const delay = now - lastHeartbeat;
  if (delay > 5000) {
    console.warn('⚠️ [FREEZE-DETECT] Main thread appears frozen for', delay, 'ms');
    console.trace('⚠️ [FREEZE-DETECT] Stack trace:');
  }
  lastHeartbeat = now;
}, 1000);

// Log when app starts
console.log('🚀 [APP] Application starting at', new Date().toISOString());

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)