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

const lastNotifiedAt = new Map<string, number>()

/** Same as `notify`, but rate-limited per `key` — for failures that can recur in a tight
 *  loop (a live-edit poll landing on a still-broken node, a permission/read check re-run
 *  on every preset row) where a fresh toast per occurrence would just be noise. At most
 *  one notification per `key` within `throttleMs` (default 3s). */
export function notifyThrottled(key: string, message: string, variant: NotifyVariant = "info", throttleMs = 3000) {
    const now = Date.now()
    const last = lastNotifiedAt.get(key) ?? 0
    if (now - last < throttleMs) return
    lastNotifiedAt.set(key, now)
    notify(message, variant)
}
