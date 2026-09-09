import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
          <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center mb-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Une erreur est survenue</h3>
          <p className="text-xs text-muted-foreground max-w-xs mb-3">
            {this.state.error?.message ?? "Erreur inconnue"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-xs bg-secondary border border-border rounded-lg px-3 py-1.5 text-foreground hover:bg-secondary/80 transition-colors"
          >
            Réessayer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
