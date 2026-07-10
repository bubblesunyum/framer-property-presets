import { framer } from "framer-plugin"

type NotifyVariant = "info" | "success" | "warning" | "error"

/** Thin wrapper around `framer.notify` (an *unprotected* SDK method) for surfacing
 *  user-facing feedback when a canvas/storage action fails or partially succeeds. Kept
 *  in one place so every call site reads the same and a missing/older host `notify`
 *  (or the preview mock) degrades to a console log instead of throwing. */
export function notify(message: string, variant: NotifyVariant = "info") {
    try {
        const notifyFn = (framer as { notify?: (message: string, options?: { variant?: NotifyVariant }) => unknown }).notify
        if (typeof notifyFn === "function") {
            notifyFn.call(framer, message, { variant })
            return
        }
    } catch {
        /* fall through to the console fallback below */
    }
    if (variant === "error" || variant === "warning") console.warn(`[SpeedStyle] ${message}`)
}
