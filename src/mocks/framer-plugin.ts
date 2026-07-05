// Dev-only stand-in for the real "framer-plugin" package, used solely by
// previewMain.tsx so PresetEditor's layout/CSS can be checked in a plain browser tab.
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

export function useIsAllowedTo(): boolean {
    return true
}

export const framer = {
    showUI: async () => {},
    subscribeToSelection: (_callback: (nodes: unknown[]) => void) => () => {},
    getPluginData: async () => null,
    setPluginData: async () => {},
    getPluginDataKeys: async () => [] as string[],
    isAllowedTo: () => true,
}
