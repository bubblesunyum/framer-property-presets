import { useEffect, useRef, useState } from "react"
import { DragCaret } from "./DragCaret"
import "./NumberField.css"

interface NumberFieldProps {
    value: number | null
    onChange: (value: number) => void
    min?: number
    max?: number
    /** Shown right after the value, reading naturally together ("375px") — hidden
     *  entirely while `disabled` since a disabled field's shown value isn't a real unit
     *  amount (see LengthField's Fit-mode use). */
    unit?: string
    /** Small dim label pinned to the far left, ahead of the value (e.g. a padding side:
     *  T/R/B/L, V/H) — always separated from the value by at least 6px. */
    leftLabel?: string
    /** Caps the field's width to ~6 characters + unit + padding so it doesn't stretch to
     *  fill its row (Width/Height/Gap/Radius) — fields with a leftLabel (pins, padding
     *  sides) intentionally don't use this, since those already size via their grid. */
    compact?: boolean
    /** Read-only: value is shown but not editable (e.g. Width/Height's computed size
     *  while their mode is "Fit", which has no real numeric value of its own). */
    disabled?: boolean
    /** Slightly dims the whole field — for a value that's currently unset (null) rather
     *  than disabled, e.g. an unpinned position edge or an unset min/max constraint. */
    dim?: boolean
    /** Adds the small drag-to-adjust up/down caret pair, anchored right. Omit for
     *  fields where a vertical drag gesture doesn't make sense. */
    showCarets?: boolean
    /** Step per caret click / arrow-key nudge. */
    step?: number
    /** Units moved per pixel while dragging the caret — higher reads as "faster". */
    dragSensitivity?: number
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max)
}

/** Plain numeric field — no native increment/decrement UI, matching Framer's own
 *  fields but with an optional drag-caret (see `showCarets`). Keeps a local text buffer
 *  that only commits (and clamps) on blur/Enter — except an arrow-key nudge, which
 *  commits immediately so the canvas updates in real time as you nudge, the same way a
 *  direct edit or drag does.
 *
 *  Renders its own pill (background/radius) rather than relying on framer.css's native
 *  input chrome, so the left label, value, and unit can share one visually connected
 *  box with the value+unit reading naturally together, left-aligned. Clicking anywhere
 *  in the box (including over the pointer-events:none label/unit) focuses and selects
 *  the input's text. */
export function NumberField({
    value,
    onChange,
    min = -Infinity,
    max = Infinity,
    unit,
    leftLabel,
    compact,
    disabled,
    dim,
    showCarets,
    step = 1,
    dragSensitivity = 1,
}: NumberFieldProps) {
    const [inputValue, setInputValue] = useState(value === null ? "" : String(value))
    const inputRef = useRef<HTMLInputElement>(null)
    const isFocusedRef = useRef(false)
    // Resync the local buffer whenever the value coming from outside changes — e.g. a
    // linked Width/Height edit (see PropertySections' aspect-ratio lock) or a
    // background poll picking up an edit made in Framer's own panel (see DesignPanel) —
    // but never while this field is focused, so an in-progress (uncommitted) keystroke
    // here can't be clobbered by a sync that raced it. Deliberately a `useEffect`, not a
    // plain during-render check: mutating a ref as a side effect of rendering breaks
    // under React StrictMode's dev-only double-invoke (the mutation "wins" on the
    // throwaway first pass, so the real pass never sees a change to react to, and the
    // display silently stops tracking the real value).
    useEffect(() => {
        if (isFocusedRef.current) return
        setInputValue(value === null ? "" : String(value))
    }, [value])
    const isNudgingRef = useRef(false)

    const commitRaw = (raw: string) => {
        const trimmed = raw.trim()
        if (trimmed === "") {
            setInputValue(value === null ? "" : String(value))
            return
        }
        const parsed = Number(trimmed)
        if (Number.isNaN(parsed)) {
            setInputValue(value === null ? "" : String(value))
            return
        }
        const clamped = clamp(parsed, min, max)
        setInputValue(String(clamped))
        onChange(clamped)
    }

    const activate = () => {
        if (disabled) return
        inputRef.current?.focus()
        inputRef.current?.select()
    }

    const classes = ["number-field"]
    if (compact) classes.push("is-compact")
    if (disabled) classes.push("is-disabled")
    if (dim) classes.push("is-dim")

    return (
        <div className={classes.join(" ")} onClick={activate}>
            {leftLabel && <span className="number-field-label">{leftLabel}</span>}
            <input
                ref={inputRef}
                className="number-field-input"
                style={{ width: `calc(${Math.max(inputValue.length, 1)}ch + 4px)` }}
                type="number"
                value={inputValue}
                disabled={disabled}
                onChange={(event) => {
                    const raw = event.currentTarget.value
                    setInputValue(raw)
                    // A native up/down-arrow nudge fires this same onChange — commit it
                    // immediately (real-time) rather than waiting for blur, same as a
                    // direct edit's Enter/blur commit.
                    if (isNudgingRef.current) {
                        isNudgingRef.current = false
                        commitRaw(raw)
                    }
                }}
                onFocus={(event) => {
                    isFocusedRef.current = true
                    event.currentTarget.select()
                }}
                onBlur={(event) => {
                    isFocusedRef.current = false
                    commitRaw(event.currentTarget.value)
                }}
                onKeyDown={(event) => {
                    if (event.key === "Enter") commitRaw(event.currentTarget.value)
                    if (event.key === "ArrowUp" || event.key === "ArrowDown") isNudgingRef.current = true
                }}
                placeholder="–"
            />
            {unit && !disabled && <span className="number-field-unit">{unit}</span>}
            {showCarets && !disabled && (
                <DragCaret value={value ?? 0} onChange={onChange} step={step} dragSensitivity={dragSensitivity} min={min} max={max} />
            )}
        </div>
    )
}
