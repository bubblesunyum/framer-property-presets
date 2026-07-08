// Dev-only stand-in for the real "framer-plugin" package, used solely by
// previewMain.tsx so the plugin's layout/CSS can be checked in a plain browser tab.
// The real package can never resolve outside an actual Framer host — it does a
// top-level `await` on a postMessage handshake with a parent frame that, standalone,
// never answers, so importing it hangs the whole module graph forever (no error, no
// timeout — see the "Edit-preset Save silently doing nothing" memory for how this same
// mechanism explained an unrelated bug). Aliased in vite.config.ts only under the
// `preview-mock` mode; the real `npm run dev`/build are untouched.
export type CanvasNode = unknown

const alwaysTrue = () => true

export const supportsName = alwaysTrue
export const supportsPins = alwaysTrue
export const supportsPosition = alwaysTrue
export const supportsSize = alwaysTrue
export const supportsSizeConstraints = alwaysTrue
export const supportsLayout = alwaysTrue
export const supportsOverflow = alwaysTrue
export const hasStackLayout = alwaysTrue
export const hasGridLayout = alwaysTrue
export const supportsOpacity = alwaysTrue
export const supportsBorderRadius = alwaysTrue
export const supportsVisible = alwaysTrue
export const supportsZIndex = alwaysTrue

export function useIsAllowedTo(): boolean {
    return true
}

// A fake selected layer so the Design (live edit) tab has something to render against
// in the standalone preview. A vertical stack with center distribute/align so the
// combined alignment grid shows a selected cell out of the box.
const fakeNode = {
    id: "preview-node",
    name: "Preview Layer",
    top: null,
    right: null,
    bottom: null,
    left: null,
    position: "relative",
    width: "1fr",
    height: "1fr",
    minWidth: "100px",
    maxWidth: "80%",
    minHeight: "200px",
    maxHeight: "800px",
    layout: "stack",
    stackDirection: "vertical",
    stackDistribution: "center",
    stackAlignment: "center",
    stackWrapEnabled: false,
    gap: "10px",
    padding: "16px",
    overflow: "visible",
    radius: "8px",
    opacity: 1,
    visible: true,
    zIndex: null,
    setAttributes: async (attributes: Record<string, unknown>) => {
        console.log("[preview] setAttributes", attributes)
    },
    getRect: async () => ({x: 0, y: 0, width: 180, height: 64}),
    getParent: async () => ({getRect: async () => ({x: 0, y: 0, width: 400, height: 400})}),
}

export const framer = {
    showUI: async () => {},
    subscribeToSelection: (callback: (nodes: unknown[]) => void) => {
        callback([fakeNode])
        return () => {}
    },
    getPluginData: async () => null,
    setPluginData: async () => {},
    getPluginDataKeys: async () => [] as string[],
    isAllowedTo: () => true,
}
