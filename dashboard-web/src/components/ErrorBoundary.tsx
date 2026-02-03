/**
 * Error Boundary
 * Catches React errors and displays fallback UI with retry option
 */
import { Component, type ReactNode, type ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  showError?: boolean;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  reportToServer?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    if (this.props.reportToServer) {
      this.props.reportToServer(error, errorInfo);
    }
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 text-center">
          <h2 className="text-xl font-semibold text-error mb-2">
            Something went wrong
          </h2>
          <p className="text-text-secondary mb-4">
            We're sorry, an unexpected error occurred.
          </p>
          {this.props.showError && this.state.error && (
            <pre className="bg-surface-elevated p-4 rounded text-sm text-left overflow-auto mb-4">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleRetry}
            className="btn btn-primary"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
