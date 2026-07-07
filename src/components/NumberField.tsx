import { useEffect, useRef, useState } from "react"
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
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max)
}

/** Plain numeric field — no increment/decrement buttons, matching Framer's own
 *  native number fields. Keeps a local text buffer that only commits (and clamps)
 *  on blur/Enter, same controlled-input shape as Framer's own field pattern.
 *
 *  The field renders its own pill (background/radius) rather than relying on
 *  framer.css's native `<input>` chrome, so the left label, value, and unit can share
 *  one visually connected box with the value+unit reading naturally together, left-
 *  aligned, rather than the unit pinned to the box's far right edge regardless of the
 *  value's width. Clicking anywhere in the box (including over the label/unit, which
 *  are pointer-events:none) focuses and selects the input's text. */
export function NumberField({
    value,
    onChange,
    min = -Infinity,
    max = Infinity,
    unit,
    leftLabel,
    compact,
    disabled,
}: NumberFieldProps) {
    const [inputValue, setInputValue] = useState(value === null ? "" : String(value))
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setInputValue(value === null ? "" : String(value))
    }, [value])

    const commitInput = () => {
        const trimmed = inputValue.trim()
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
                onChange={(event) => setInputValue(event.currentTarget.value)}
                onFocus={(event) => event.currentTarget.select()}
                onBlur={commitInput}
                onKeyDown={(event) => {
                    if (event.key === "Enter") commitInput()
                }}
                placeholder="–"
            />
            {unit && !disabled && <span className="number-field-unit">{unit}</span>}
        </div>
    )
}
