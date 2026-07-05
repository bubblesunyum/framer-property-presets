import { Component, type ErrorInfo, type ReactNode } from "react"

interface ErrorBoundaryProps {
    children: ReactNode
}

interface ErrorBoundaryState {
    error: Error | null
    componentStack: string | null
}

function ErrorDetails({ title, error, componentStack }: { title: string; error: Error; componentStack?: string | null }) {
    return (
        <div style={{ padding: 16, overflow: "auto", height: "100%" }}>
            <p style={{ fontWeight: 600, marginBottom: 8, color: "var(--framer-color-text)" }}>{title}</p>
            <pre
                style={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    color: "var(--framer-color-text-tertiary)",
                    fontSize: 11,
                    lineHeight: 1.5,
                    fontFamily: "monospace",
                }}
            >
                {error.message}
                {error.stack ? `\n\n${error.stack}` : ""}
                {componentStack ? `\n\nComponent stack:${componentStack}` : ""}
            </pre>
        </div>
    )
}

/** Covers render-phase errors only — React error boundaries do not catch errors
 *  thrown inside event handlers (onClick/onChange/etc). See main.tsx for the
 *  window-level handlers that cover that other half. Shows the full stack (not just
 *  the message) since this plugin is still under active development. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { error: null, componentStack: null }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { error }
    }

    componentDidCatch(_error: Error, info: ErrorInfo) {
        this.setState({ componentStack: info.componentStack ?? null })
    }

    render() {
        if (this.state.error) {
            return <ErrorDetails title="Render error" error={this.state.error} componentStack={this.state.componentStack} />
        }
        return this.props.children
    }
}
