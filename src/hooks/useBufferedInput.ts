import { useEffect, useState } from "react"

/** Local buffer for a fast-moving control (typing, dragging a slider) that should only
 *  propagate its value — and thus only trigger a re-render of everything that reads it
 *  — on blur/Enter/release rather than on every keystroke or drag-tick. Committing on
 *  every keystroke re-renders this editor's entire property list each time, which is
 *  both wasteful and, per repeated field reports, is what exposes the app to a
 *  still-unidentified browser-extension DOM race (see the "Browser-extension DOM
 *  interference" memory) — every extra reconciliation pass is another chance for it to
 *  hit. Mirrors the pattern NumberField/LengthField already used for the same reason. */
export function useBufferedInput<T>(value: T, onCommit: (value: T) => void) {
    const [pending, setPending] = useState(value)

    useEffect(() => {
        setPending(value)
    }, [value])

    const commit = () => {
        if (pending !== value) onCommit(pending)
    }

    return [pending, setPending, commit] as const
}
