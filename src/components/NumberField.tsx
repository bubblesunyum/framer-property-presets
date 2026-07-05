import { useEffect, useState } from "react"
import "./NumberField.css"

interface NumberFieldProps {
    value: number | null
    onChange: (value: number) => void
    min?: number
    max?: number
    unit?: string
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max)
}

/** Plain numeric field — no increment/decrement buttons, matching Framer's own
 *  native number fields. Keeps a local text buffer that only commits (and clamps)
 *  on blur/Enter, same controlled-input shape as Framer's own field pattern. */
export function NumberField({ value, onChange, min = -Infinity, max = Infinity, unit }: NumberFieldProps) {
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

    return (
        <div className="number-field">
            <input
                className={unit ? "number-field-input has-unit" : "number-field-input"}
                type="number"
                value={inputValue}
                onChange={(event) => setInputValue(event.currentTarget.value)}
                onBlur={commitInput}
                onKeyDown={(event) => {
                    if (event.key === "Enter") commitInput()
                }}
                placeholder="–"
            />
            {unit && <span className="number-field-unit">{unit}</span>}
        </div>
    )
}
