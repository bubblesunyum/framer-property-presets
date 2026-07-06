import { useEffect, useState } from "react"
import "./NumberField.css"

interface NumberFieldProps {
    value: number | null
    onChange: (value: number) => void
    min?: number
    max?: number
    unit?: string
    /** Render the unit right after the value ("375px") instead of pinned to the far
     *  right of the field — the input shrinks to its content so the two read together. */
    inlineUnit?: boolean
    /** Small dim label pinned to the far left of the field (e.g. a padding side: V/H). */
    leftLabel?: string
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max)
}

/** Plain numeric field — no increment/decrement buttons, matching Framer's own
 *  native number fields. Keeps a local text buffer that only commits (and clamps)
 *  on blur/Enter, same controlled-input shape as Framer's own field pattern. */
export function NumberField({ value, onChange, min = -Infinity, max = Infinity, unit, inlineUnit, leftLabel }: NumberFieldProps) {
    const [inputValue, setInputValue] = useState(value === null ? "" : String(value))

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

    const inputClasses = ["number-field-input"]
    if (!inlineUnit && unit) inputClasses.push("has-unit")
    if (!inlineUnit && leftLabel) inputClasses.push("has-left")

    return (
        <div className={inlineUnit ? "number-field is-inline" : "number-field"}>
            {leftLabel && <span className="number-field-side">{leftLabel}</span>}
            <input
                className={inputClasses.join(" ")}
                // Size to content so the value + unit read together ("375px"). The +10px
                // covers the input's left padding (border-box) so digits aren't clipped.
                style={inlineUnit ? { width: `calc(${Math.max(inputValue.length, 1)}ch + 10px)` } : undefined}
                type="number"
                value={inputValue}
                onChange={(event) => setInputValue(event.currentTarget.value)}
                onBlur={commitInput}
                onKeyDown={(event) => {
                    if (event.key === "Enter") commitInput()
                }}
                placeholder="–"
            />
            {unit && <span className={inlineUnit ? "number-field-unit is-inline" : "number-field-unit"}>{unit}</span>}
        </div>
    )
}
