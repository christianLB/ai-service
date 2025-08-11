import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Result, Button } from 'antd';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    console.error('Component stack:', errorInfo.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Optionally reload the page
    if (this.props.name === 'trading') {
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Result
          status="error"
          title="Something went wrong"
          subTitle={
            this.props.name === 'trading' 
              ? "The trading section encountered an error. This might be due to connection issues or missing data."
              : "An unexpected error occurred. Please try refreshing the page."
          }
          extra={[
            <Button type="primary" onClick={this.handleReset} key="reset">
              Go to Dashboard
            </Button>,
            <Button key="reload" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>,
          ]}
        >
          {import.meta.env.DEV && this.state.error && (
            <div style={{ 
              marginTop: 24, 
              padding: 16, 
              background: '#f0f0f0', 
              borderRadius: 4,
              textAlign: 'left',
              maxWidth: 600,
              margin: '24px auto 0',
            }}>
              <strong>Error Details (Development Only):</strong>
              <pre style={{ fontSize: 12, overflow: 'auto' }}>
                {this.state.error.toString()}
                {this.state.error.stack && (
                  <>
                    {'\n\nStack trace:\n'}
                    {this.state.error.stack}
                  </>
                )}
              </pre>
            </div>
          )}
        </Result>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;