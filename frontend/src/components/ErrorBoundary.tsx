import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
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
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6 w-full">
          <div className="bg-surface border border-accent/30 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl space-y-5 animate-in fade-in">
            <div className="w-14 h-14 bg-accent/15 text-accent rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-text">
                {this.props.fallbackTitle || 'Unable to Display Content'}
              </h2>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                An unexpected interface issue occurred. Your trip data and saved itineraries
                remain safe in the database.
              </p>
              {this.state.error?.message && (
                <div className="mt-3 p-3 bg-surface-alt/70 border border-border rounded-xl text-left">
                  <div className="text-[10px] uppercase font-bold text-muted">Error Details</div>
                  <div className="text-xs text-red-400 font-mono mt-1 break-words">
                    {this.state.error.message}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => (window.location.href = '/dashboard')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface-alt hover:bg-surface-hover text-xs font-semibold text-text transition-all"
              >
                <Home className="w-4 h-4" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-background text-xs font-bold transition-all shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
