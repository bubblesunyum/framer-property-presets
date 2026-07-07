/** Backs every field's "grab anywhere and drag up/down to adjust" gesture (NumberField,
 *  the dimension unit fields, Z-Index, etc). Framework-agnostic on purpose — it doesn't
 *  know about React, pointer events, or DOM — so the value-tracking logic can be unit
 *  tested directly instead of only through simulated pointer events.
 *
 *  Why this exists instead of just reading a `value` prop at drag-start: a component
 *  that captures `dragStartValue = props.value` at the moment a drag begins is reading
 *  whatever React last rendered — which can be one commit behind the *real* current
 *  value if the user starts a second drag before the first one's `onChange` has round-
 *  tripped back through the parent and into a fresh render. That's what caused the
 *  reported "drag jumps back to the start value" bug: a fast drag-release-drag-again
 *  sequence would start the second drag from a stale base. This tracker keeps its own
 *  authoritative `lastKnownValue`, updated synchronously by its own `move()` calls
 *  during a drag — so a second drag always starts from where the first one actually
 *  left off, regardless of whether the surrounding UI has re-rendered yet. */
export interface DragValueTracker {
    /** Call whenever the value coming from outside changes (e.g. a linked field, or a
     *  realtime poll). Ignored while a drag is in progress, so an external update can't
     *  yank the value out from under an active gesture. */
    sync(externalValue: number): void
    /** Begin tracking a drag from the given pointer Y and the tracker's current value. */
    start(startY: number): void
    /** Report a pointer move during an active drag; returns the new clamped value (or
     *  the last known value, unchanged, if no drag is in progress). */
    move(currentY: number, sensitivity: number, min: number, max: number): number
    /** End the current drag, if any. */
    end(): void
    readonly isDragging: boolean
    readonly value: number
}

export function createDragValueTracker(initialValue: number): DragValueTracker {
    let lastKnownValue = initialValue
    let drag: {startY: number; startValue: number} | null = null

    return {
        sync(externalValue) {
            if (drag) return
            lastKnownValue = externalValue
        },
        start(startY) {
            drag = {startY, startValue: lastKnownValue}
        },
        move(currentY, sensitivity, min, max) {
            if (!drag) return lastKnownValue
            const deltaPixels = drag.startY - currentY
            const next = Math.min(Math.max(Math.round(drag.startValue + deltaPixels * sensitivity), min), max)
            lastKnownValue = next
            return next
        },
        end() {
            drag = null
        },
        get isDragging() {
            return drag !== null
        },
        get value() {
            return lastKnownValue
        },
    }
}

/** How far (in pixels) a pointer has to move before a press is treated as a drag rather
 *  than a click — shared so every caller agrees on the same threshold. */
export const DRAG_THRESHOLD_PX = 3
