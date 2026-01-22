import { Component } from 'react';

/**
 * Global Error Boundary
 * Catches JavaScript errors anywhere in the child component tree and displays
 * a fallback UI instead of a blank/black screen.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so next render shows fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRefresh = () => {
    // Clear any potentially corrupted state
    try {
      localStorage.removeItem('global_reset_v1');
    } catch (e) {
      // Ignore localStorage errors
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-6">
            {/* Icon */}
            <div className="text-6xl">
              <picture>
                <source srcSet="https://fonts.gstatic.com/s/e/notoemoji/latest/1f61e/512.webp" type="image/webp" />
                <img 
                  src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f61e/512.gif" 
                  alt="Sad face" 
                  width="64" 
                  height="64" 
                  className="mx-auto"
                />
              </picture>
            </div>
            
            {/* Message */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white">
                Something went wrong
              </h1>
              <p className="text-slate-400">
                The app encountered an unexpected error. 
                This is usually fixed by refreshing the page.
              </p>
            </div>

            {/* Action Button */}
            <button
              onClick={this.handleRefresh}
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
              Refresh Page
            </button>

            {/* Help text */}
            <p className="text-xs text-slate-500">
              If this keeps happening, try clearing your browser cache or using a different browser.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
