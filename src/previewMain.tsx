// Dev-only entry point (see preview.html) for visually checking the plugin's
// layout/CSS without a real Framer host. Renders the real <App/> against the mocked
// "framer-plugin" package (aliased in vite.config.ts under `preview-mock`), which feeds
// in a fake selected layer so the Design tab has something to edit. Not shipped.
import "framer-plugin/framer.css"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import "./App.css"

function PreviewHarness() {
    return (
        <div style={{ width: 300, height: 600, margin: "40px auto", border: "1px solid #333" }}>
            <App />
        </div>
    )
}

document.body.dataset.framerTheme = "dark"

// vite-plugin-framer injects a full-screen "this is a Framer Plugin" overlay into every
// HTML entry (see its transformIndexHtml hook) whenever `window.self === window.top` —
// true here since this harness deliberately isn't embedded in anything. It sets its
// display inline with `!important`, which a stylesheet rule can't out-rank, so just
// remove the node whenever it (re)appears.
// Primary: an id + !important rule out-ranks the overlay's inline `display: flex`
// (which is set without !important), so it stays hidden however/whenever it's created.
const hideStyle = document.createElement("style")
hideStyle.textContent = "#framer-environment-error { display: none !important; }"
document.head.appendChild(hideStyle)
// Belt-and-suspenders: also remove the node outright if it appears.
const removeFramerOverlay = () => document.getElementById("framer-environment-error")?.remove()
removeFramerOverlay()
window.addEventListener("DOMContentLoaded", removeFramerOverlay)

const rootElement = document.getElementById("root")
if (!rootElement) throw new Error("Root element not found")

createRoot(rootElement).render(
    <StrictMode>
        <PreviewHarness />
    </StrictMode>
)
