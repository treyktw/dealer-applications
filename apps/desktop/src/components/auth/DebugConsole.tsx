// src/components/debug/DebugConsole.tsx - Global log console overlay
import { useState, useEffect, useRef, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';

interface LogEntry {
  timestamp: number;
  level: 'info' | 'success' | 'warning' | 'error' | 'rust';
  message: string;
}

export function DebugConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'info' | 'success' | 'warning' | 'error' | 'rust'>('all');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Add log entry
  const addLog = useCallback((level: LogEntry['level'], message: string) => {
    setLogs(prev => [...prev, { timestamp: Date.now(), level, message }]);
  }, []);

  // Listen for Tauri logs (from Rust)
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<string>('rust-log', (event) => {
      addLog('rust', event.payload);
    }).then(fn => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, [addLog]);

  // Intercept console methods
  useEffect(() => {
    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      // Detect level from emojis in message
      if (message.includes('✅')) {
        addLog('success', message);
      } else if (message.includes('⚠️') || message.includes('❌')) {
        addLog('error', message);
      } else {
        addLog('info', message);
      }
      
      originalLog.apply(console, args);
    };

    console.info = (...args) => {
      addLog('info', args.join(' '));
      originalInfo.apply(console, args);
    };

    console.warn = (...args) => {
      addLog('warning', args.join(' '));
      originalWarn.apply(console, args);
    };

    console.error = (...args) => {
      addLog('error', args.join(' '));
      originalError.apply(console, args);
    };

    return () => {
      console.log = originalLog;
      console.info = originalInfo;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, [addLog]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [autoScroll]);

  // Toggle with keyboard shortcut (Cmd/Ctrl + Shift + D)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const clearLogs = () => setLogs([]);

  const filteredLogs = logs.filter(log => 
    filter === 'all' || log.level === filter
  );

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      case 'rust': return 'text-purple-400';
      default: return 'text-gray-300';
    }
  };

  const getLevelBg = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return 'bg-green-500/10 border-green-500/20';
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/20';
      case 'error': return 'bg-red-500/10 border-red-500/20';
      case 'rust': return 'bg-purple-500/10 border-purple-500/20';
      default: return 'bg-gray-500/10 border-gray-500/20';
    }
  };

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'rust': return '🦀';
      default: return 'ℹ️';
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-[9999] bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg border border-gray-700 text-sm font-mono flex items-center gap-2 transition-all"
        title="Open Debug Console (Cmd+Shift+D)"
      >
        <span>🐛</span>
        <span>Debug</span>
        {logs.length > 0 && (
          <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
            {logs.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <div className="absolute bottom-0 left-0 right-0 h-[60vh] bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 shadow-2xl pointer-events-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-3">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <span>🐛</span>
              <span>Debug Console</span>
            </h3>
            <span className="text-gray-400 text-sm">
              {filteredLogs.length} logs
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="flex gap-1">
              {(['all', 'info', 'success', 'warning', 'error', 'rust'] as const).map(level => (
                <button
                  type="button"
                  key={level}
                  onClick={() => setFilter(level)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    filter === level
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                  {level !== 'all' && (
                    <span className="ml-1 text-xs opacity-70">
                      ({logs.filter(l => l.level === level).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Auto-scroll toggle */}
            <button
              type="button"
              onClick={() => setAutoScroll(!autoScroll)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                autoScroll
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title="Toggle auto-scroll"
            >
              {autoScroll ? '📜 Auto' : '📜 Manual'}
            </button>

            {/* Clear button */}
            <button
              type="button"
              onClick={clearLogs}
              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs font-medium transition-all"
            >
              Clear
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-medium transition-all"
              title="Close (Cmd+Shift+D)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className="flex-1 overflow-y-auto font-mono text-sm p-4 space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No logs yet</p>
              <p className="text-xs mt-2">Logs will appear here as your app runs</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.timestamp}
                className={`p-3 rounded border ${getLevelBg(log.level)} transition-all`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg flex-shrink-0">
                    {getLevelIcon(log.level)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold uppercase ${getLevelColor(log.level)}`}>
                        {log.level}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className={`text-xs ${getLevelColor(log.level)} whitespace-pre-wrap break-words`}>
                      {log.message}
                    </pre>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-700 bg-gray-800/50 text-xs text-gray-400">
          <div className="flex items-center justify-between">
            <span>Press <kbd className="px-2 py-0.5 bg-gray-700 rounded">Cmd+Shift+D</kbd> to toggle</span>
            <span>Auto-scroll: {autoScroll ? 'ON' : 'OFF'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}