import { Component, type ReactNode } from "react";

/** A render error should preserve the existing recovery screen rather than a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold tracking-tight">This page didn't load</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Something went wrong on our end. You can try refreshing or head back home.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => this.setState({ failed: false })}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Try again
            </button>
            <a href="/" className="rounded-md border border-input px-4 py-2 text-sm font-medium">
              Go home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
