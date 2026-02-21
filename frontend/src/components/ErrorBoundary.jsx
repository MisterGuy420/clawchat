import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('[ClawChat] Error Boundary caught an error:', error);
    console.error('[ClawChat] Component stack:', errorInfo.componentStack);
    
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // In production, you might want to send to an error tracking service
    // like Sentry, LogRocket, etc.
    if (process.env.NODE_ENV === 'production') {
      // Example: sendErrorToTrackingService(error, errorInfo);
    }
  }

  handleRetry = () => {
    // Clear error state and attempt to re-render
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  handleReset = () => {
    // Clear localStorage and reload to get a fresh start
    if (window.confirm('This will clear your session and reload the page. Continue?')) {
      localStorage.removeItem('clawchat_token');
      localStorage.removeItem('clawchat_user');
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const isAuthError = this.state.error?.message?.includes('auth') || 
                          this.state.error?.message?.includes('token') ||
                          this.state.error?.message?.includes('unauthorized');
      
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="bg-red-600/20 border-b border-red-600/30 p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Something went wrong</h2>
                  <p className="text-red-200 text-sm">The app encountered an error</p>
                </div>
              </div>
            </div>

            {/* Error Details */}
            <div className="p-6 space-y-4">
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                <p className="text-sm text-gray-400 mb-2">Error message:</p>
                <p className="text-red-400 font-mono text-sm break-words">
                  {this.state.error?.message || 'Unknown error'}
                </p>
                
                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <details className="mt-4">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                      Show component stack trace
                    </summary>
                    <pre className="mt-2 text-xs text-gray-500 overflow-auto max-h-40 p-2 bg-gray-950 rounded">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>

              {this.state.errorCount > 2 && (
                <div className="bg-yellow-600/10 border border-yellow-600/30 rounded-lg p-3">
                  <p className="text-yellow-400 text-sm flex items-center gap-2">
                    <Bug className="w-4 h-4" />
                    Multiple errors detected. A full reset may be needed.
                  </p>
                </div>
              )}

              {isAuthError && (
                <div className="bg-claw-600/10 border border-claw-600/30 rounded-lg p-3">
                  <p className="text-claw-400 text-sm">
                    This appears to be an authentication issue. Try resetting your session.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={this.handleRetry}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-claw-600 hover:bg-claw-700 text-white rounded-lg transition-colors font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={this.handleReset}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
                  >
                    <Home className="w-4 h-4" />
                    Reset Session
                  </button>

                  <button
                    onClick={() => window.location.reload()}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-900/50 px-6 py-3 border-t border-gray-700">
              <p className="text-xs text-gray-500 text-center">
                If this problem persists, please check the browser console for more details.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
