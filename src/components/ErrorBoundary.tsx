import { Component, type ErrorInfo, type ReactNode } from "react"

interface ErrorBoundaryProps {
    children: ReactNode
}

interface ErrorBoundaryState {
    hasError: boolean
}

function ErrorFallback() {
    return (
        <div
            style={{
                padding: 24,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 6,
            }}
        >
            <p style={{ fontWeight: 600, color: "var(--framer-color-text)" }}>Something went wrong</p>
            <p style={{ color: "var(--framer-color-text-tertiary)", fontSize: 11, lineHeight: 1.5 }}>
                Try reopening the plugin. If it keeps happening, restart Framer.
            </p>
        </div>
    )
}

/** Covers render-phase errors only — React error boundaries do not catch errors thrown
 *  inside event handlers (onClick/onChange/etc). See main.tsx for the window-level
 *  handlers that cover that other half. Shows a friendly message; the underlying error is
 *  logged to the console for debugging rather than shown to the user. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false }

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true }
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("[SpeedStyle] render error", error, info.componentStack)
    }

    render() {
        if (this.state.hasError) return <ErrorFallback />
        return this.props.children
    }
}
