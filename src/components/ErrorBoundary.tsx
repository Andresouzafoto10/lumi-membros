import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

type SentryGlobal = {
  captureException?: (err: unknown, ctx?: Record<string, unknown>) => void;
};

const CHUNK_RELOAD_KEY = "chunk_reload_attempted";

function isChunkError(error: Error): boolean {
  return (
    error.message?.includes("Failed to fetch dynamically imported module") ||
    error.message?.includes("Importing a module script failed") ||
    error.name === "ChunkLoadError"
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
    // Clear flag on fresh mount so future chunk errors can still trigger reload
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (isChunkError(error)) {
      if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
        window.location.reload();
        return;
      }
    }

    console.error("[ErrorBoundary]", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      componentStack: info.componentStack,
      url: typeof window !== "undefined" ? window.location.href : null,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      timestamp: new Date().toISOString(),
    });

    // Forward to Sentry if the global is configured at runtime.
    const sentry = (typeof window !== "undefined"
      ? (window as unknown as { Sentry?: SentryGlobal }).Sentry
      : undefined);
    if (sentry?.captureException) {
      sentry.captureException(error, {
        contexts: { react: { componentStack: info.componentStack } },
      });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="mx-auto max-w-md text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              Algo deu errado
            </h2>
            <p className="text-sm text-muted-foreground">
              Ocorreu um erro inesperado. Tente recarregar a pagina.
            </p>
            {this.state.error && (
              <pre className="mt-2 max-h-32 overflow-auto rounded-md bg-muted p-3 text-left text-xs text-muted-foreground">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex justify-center gap-3 pt-2">
              <Button variant="outline" onClick={this.handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Tentar novamente
              </Button>
              <Button onClick={() => window.location.reload()}>
                Recarregar pagina
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
