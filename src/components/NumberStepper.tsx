import { NumberField } from "./NumberField"
import "./NumberStepper.css"

interface NumberStepperProps {
    value: number | null
    min?: number
    max?: number
    onChange: (value: number) => void
}

/** A plain number field plus a small connected +/- pair beside it (for Z-Index, where
 *  nudging by one is the common case) — the field itself stays directly editable too. */
export function NumberStepper({ value, min = -Infinity, max = Infinity, onChange }: NumberStepperProps) {
    const step = (delta: number) => {
        const base = value ?? 0
        onChange(Math.min(Math.max(base + delta, min), max))
    }

    return (
        <div className="number-stepper">
            <NumberField value={value} min={min} max={max} onChange={onChange} />
            <div className="number-stepper-buttons">
                <button type="button" className="number-stepper-button" aria-label="Decrease" onClick={() => step(-1)}>
                    −
                </button>
                <button type="button" className="number-stepper-button" aria-label="Increase" onClick={() => step(1)}>
                    +
                </button>
            </div>
        </div>
    )
}
