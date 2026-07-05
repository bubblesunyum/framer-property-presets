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

// Browser extensions (Grammarly, password managers, Google Translate, etc.) sometimes
// rewrite the DOM around a focused text input — e.g. the preset name field — behind
// React's back. React's own reconciliation is correct; it just has no way to know a
// node it's about to remove/reposition was already moved by something else. The result
// is an uncaught `NotFoundError` from `removeChild`/`insertBefore` that crashes the
// whole plugin on a single keystroke (this has already been diagnosed twice — see the
// "Browser-extension DOM interference" memory). Since we can't control which extensions
// a given user has installed, patch the two DOM primitives react-dom's commit phase
// calls so a stale/mismatched node is skipped with a warning instead of thrown.
patchDomForThirdPartyMutations()

function patchDomForThirdPartyMutations() {
    const originalRemoveChild = Node.prototype.removeChild
    Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
        if (child.parentNode !== this) {
            console.warn("Ignored removeChild: node was already detached from its expected parent (likely a browser extension).", child)
            return child
        }
        return originalRemoveChild.call(this, child) as T
    }

    const originalInsertBefore = Node.prototype.insertBefore
    Node.prototype.insertBefore = function <T extends Node>(this: Node, newNode: T, referenceNode: Node | null): T {
        if (referenceNode && referenceNode.parentNode !== this) {
            console.warn(
                "Ignored insertBefore: reference node is no longer a child of its expected parent (likely a browser extension).",
                referenceNode
            )
            return newNode
        }
        return originalInsertBefore.call(this, newNode, referenceNode) as T
    }
}

// React's ErrorBoundary only catches render-phase errors, not errors thrown inside
// event handlers (onClick/onChange/etc) — these two listeners cover that other half,
// writing straight to the DOM so they still work even if React itself is in a bad
// state. Deliberately verbose (full stack, not just message) while this plugin is
// still under active development.
function showGlobalError(title: string, detail: string) {
    const rootElement = document.getElementById("root")
    if (!rootElement) return
    const container = document.createElement("div")
    container.style.cssText = "padding:16px;overflow:auto;height:100%"
    const heading = document.createElement("p")
    heading.textContent = title
    heading.style.cssText = "font-weight:600;margin-bottom:8px;color:var(--framer-color-text)"
    const pre = document.createElement("pre")
    pre.textContent = detail
    pre.style.cssText =
        "white-space:pre-wrap;word-break:break-word;color:var(--framer-color-text-tertiary);font-size:11px;line-height:1.5;font-family:monospace"
    container.append(heading, pre)
    rootElement.replaceChildren(container)
}

window.addEventListener("error", (event) => {
    showGlobalError("Uncaught error", `${event.message}\n\n${event.error instanceof Error ? (event.error.stack ?? "") : ""}`)
})

window.addEventListener("unhandledrejection", (event) => {
    const { reason } = event
    showGlobalError(
        "Unhandled promise rejection",
        reason instanceof Error ? `${reason.message}\n\n${reason.stack ?? ""}` : String(reason)
    )
})

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
