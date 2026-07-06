import react from "@vitejs/plugin-react"
import path from "node:path"
import { defineConfig } from "vite"
import framer from "vite-plugin-framer"
import mkcert from "vite-plugin-mkcert"

// `preview-mock` (see preview.html/previewMain.tsx) swaps the real "framer-plugin"
// package for a local stub so its layout/CSS can be checked in a plain browser tab —
// the real package can't ever load outside an actual Framer host (see
// src/mocks/framer-plugin.ts). Only active under that mode; `npm run dev`/`build` are
// unaffected.
export default defineConfig(({ mode }) => ({
    // mkcert forces HTTPS, which the real dev server needs to embed in Framer. The
    // standalone preview-mock harness isn't embedded in anything, so it serves plain
    // HTTP instead — otherwise the self-signed cert blocks non-browser preview clients.
    plugins: mode === "preview-mock" ? [react(), framer()] : [react(), mkcert(), framer()],
    resolve: {
        // Exact-match regex, not the plain-string object form — that does a prefix
        // replace and would also swallow the unrelated "framer-plugin/framer.css" CSS
        // import, which needs to keep resolving to the real package.
        alias:
            mode === "preview-mock"
                ? [{ find: /^framer-plugin$/, replacement: path.resolve(__dirname, "src/mocks/framer-plugin.ts") }]
                : [],
    },
    // preview-mock aliases away the real "framer-plugin" package, so Vite's dependency
    // optimizer never pre-bundles it under that mode. Without its own cacheDir, running
    // preview-mock alongside a real `npm run dev` clobbers the shared node_modules/.vite
    // cache with a copy that's missing framer-plugin, breaking the real dev server with
    // 504s until its cache is cleared — this happened once already.
    cacheDir: mode === "preview-mock" ? "node_modules/.vite-preview-mock" : undefined,
    // Forces one complete dependency scan on cold start instead of an initial pass that
    // discovers `framer-plugin` late and has to redo the bundle with new chunk hashes —
    // that second pass is what left the browser holding a reference to a chunk file
    // from the first pass that no longer exists ("chunk-*.js 404" / "does not exist in
    // the optimize deps directory").
    optimizeDeps: {
        include: ["react", "react-dom", "react-dom/client", "react/jsx-dev-runtime", "framer-plugin"],
    },
}))
