import "framer-plugin/framer.css"
import { framer } from "framer-plugin"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import "./App.css"
import { ErrorBoundary } from "./components/ErrorBoundary"

// This plugin is dark-only by design (see App.css) — pin the theme attribute so
// framer.css's few hardcoded (non-variable) dark-theme rules apply consistently
// regardless of the host app's current light/dark setting.
document.body.dataset.framerTheme = "dark"

// React's ErrorBoundary only catches render-phase errors, not errors thrown inside event
// handlers (onClick/onChange/etc) — these two listeners cover that other half, writing
// straight to the DOM so they still work even if React itself is in a bad state. Shows a
// friendly, generic message (the raw error is logged to the console for debugging, not
// shown to the user).
function showGlobalError(error: unknown) {
    console.error("[SpeedStyle] uncaught error", error)
    const rootElement = document.getElementById("root")
    if (!rootElement) return
    const container = document.createElement("div")
    container.style.cssText = "padding:24px;height:100%;display:flex;flex-direction:column;justify-content:center;gap:6px"
    const heading = document.createElement("p")
    heading.textContent = "Something went wrong"
    heading.style.cssText = "font-weight:600;color:var(--framer-color-text)"
    const detail = document.createElement("p")
    detail.textContent = "Try reopening the plugin. If it keeps happening, restart Framer."
    detail.style.cssText = "color:var(--framer-color-text-tertiary);font-size:11px;line-height:1.5"
    container.append(heading, detail)
    rootElement.replaceChildren(container)
}

window.addEventListener("error", (event) => showGlobalError(event.error ?? event.message))
window.addEventListener("unhandledrejection", (event) => showGlobalError(event.reason))

void framer.showUI({
    position: "top right",
    width: 300,
    height: 480,
    minWidth: 260,
    minHeight: 360,
    resizable: true,
})

const rootElement = document.getElementById("root")
if (!rootElement) throw new Error("Root element not found")

createRoot(rootElement).render(
    <StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </StrictMode>
)
