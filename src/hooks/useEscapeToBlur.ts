import { useEffect } from "react"

/** Pressing Escape while a field in this plugin is focused should release it — and,
 *  crucially, hand focus back to the canvas (rather than leaving it stranded on
 *  `document.body` inside this plugin's iframe) so a *second* Escape reaches Framer's
 *  own keyboard shortcuts instead of being swallowed here with nothing left to do.
 *  There's no framer-plugin API to explicitly focus the host canvas, so blurring the
 *  active element is the best available approximation — once nothing in this iframe
 *  holds focus, the browser's own focus handling is what decides where it goes next. */
export function useEscapeToBlur() {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return
            const active = document.activeElement
            if (active instanceof HTMLElement && active !== document.body) active.blur()
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [])
}
