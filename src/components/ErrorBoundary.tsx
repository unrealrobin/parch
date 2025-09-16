import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; errorInfo?: React.ErrorInfo }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 ERROR BOUNDARY CAUGHT ERROR:', error);
    console.error('🚨 ERROR INFO:', errorInfo);
    
    // Log to backend for debugging
    console.error('Component Stack:', errorInfo.componentStack);
    
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;
      
      if (FallbackComponent && this.state.error) {
        return <FallbackComponent error={this.state.error} errorInfo={this.state.errorInfo} />;
      }

      return (
        <div className="error-boundary">
          <h2>🚨 Something went wrong</h2>
          <details style={{ whiteSpace: 'pre-wrap', padding: '10px', background: '#f5f5f5' }}>
            <summary>Error Details</summary>
            <p><strong>Error:</strong> {this.state.error?.message}</p>
            <p><strong>Stack:</strong> {this.state.error?.stack}</p>
            {this.state.errorInfo && (
              <p><strong>Component Stack:</strong> {this.state.errorInfo.componentStack}</p>
            )}
          </details>
          <button onClick={() => window.location.reload()}>Reload Application</button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Fallback component for file management errors
export const FileManagerErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div className="file-manager-error">
    <h3>🚨 File Manager Error</h3>
    <p>There was an error with file operations: {error.message}</p>
    <button onClick={() => window.location.reload()}>Restart Application</button>
  </div>
);