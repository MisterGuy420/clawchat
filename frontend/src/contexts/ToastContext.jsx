import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useTheme } from './ThemeContext';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, toast]);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message, options = {}) => {
    const { type = 'info', duration = 5000 } = options;
    return addToast(message, type, duration);
  }, [addToast]);

  const success = useCallback((message, options = {}) => {
    return addToast(message, 'success', options.duration || 4000);
  }, [addToast]);

  const error = useCallback((message, options = {}) => {
    return addToast(message, 'error', options.duration || 6000);
  }, [addToast]);

  const info = useCallback((message, options = {}) => {
    return addToast(message, 'info', options.duration || 5000);
  }, [addToast]);

  const value = {
    toast,
    success,
    error,
    info,
    removeToast
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }) {
  const { isDark } = useTheme();
  
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />
  };

  const getStyles = (type) => {
    const borderColors = {
      success: 'border-green-500/30',
      error: 'border-red-500/30',
      info: 'border-blue-500/30'
    };
    
    const bgColors = isDark 
      ? 'bg-gray-800'
      : 'bg-white';
    
    return `${borderColors[type]} ${bgColors}`;
  };

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${getStyles(toast.type)} min-w-[300px] max-w-md animate-slideIn`}
      role="alert"
    >
      {icons[toast.type]}
      <p className={`flex-1 text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className={`p-1 rounded transition-colors ${
          isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
        }`}
        aria-label="Dismiss"
      >
        <X className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
