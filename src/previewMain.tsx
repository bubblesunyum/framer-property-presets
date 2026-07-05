// Dev-only entry point (see preview.html) for visually checking PresetEditor's layout
// without needing a real Framer host. Not part of the shipped plugin build.
import "framer-plugin/framer.css"
import { StrictMode, useState } from "react"
import { createRoot } from "react-dom/client"
import "./App.css"
import { PresetEditor } from "./components/PresetEditor"
import type { Preset } from "./types/preset"

// Deliberately mimics the user's bug repro: a preset originally captured from a
// "None"-flow node, so it has no overflow/stack/grid keys at all — everything past
// gap/padding/position/size should only appear once Flow is switched in the editor.
const fakePreset: Preset = {
    id: "preview",
    name: "Card Stack",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    location: "local",
    properties: {
        layout: null,
        position: "relative",
        gap: "10px",
        padding: "16px",
        width: "1fr",
        height: "1fr",
        minWidth: "100px",
        maxWidth: "80%",
        minHeight: "200px",
        maxHeight: "800px",
    },
}

function PreviewHarness() {
    const [key, setKey] = useState(0)

    return (
        <div style={{ width: 300, height: 600, margin: "40px auto", border: "1px solid #333" }}>
            <PresetEditor
                key={key}
                mode="edit"
                preset={fakePreset}
                onSaved={() => setKey((k) => k + 1)}
                onCancel={() => setKey((k) => k + 1)}
            />
        </div>
    )
}

document.body.dataset.framerTheme = "dark"

// vite-plugin-framer injects a "this is a Framer Plugin" overlay into every HTML entry
// (see its transformIndexHtml hook) whenever `window.self === window.top` — true here
// since this harness deliberately isn't embedded in anything. A stylesheet rule beats
// timing races against that injected inline-style script.
const style = document.createElement("style")
style.textContent = "#framer-environment-error { display: none !important; }"
document.head.appendChild(style)

const rootElement = document.getElementById("root")
if (!rootElement) throw new Error("Root element not found")

createRoot(rootElement).render(
    <StrictMode>
        <PreviewHarness />
    </StrictMode>
)
