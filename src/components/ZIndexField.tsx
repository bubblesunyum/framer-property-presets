import { NumberField } from "./NumberField"
import "./ZIndexField.css"

interface ZIndexFieldProps {
    value: number | null
    onChange: (value: number) => void
}

const SNAP_MAX = 5

/** Z-Index gets two ways to nudge it: the field itself (with its own drag/click carets,
 *  anchored right — see NumberField's `showCarets`), and a 6-snap-point slider below it
 *  for quickly jumping between the first few stacking positions (0–5), the common case.
 *  Values above 5 are still fully valid — the slider just pins to its top end for those,
 *  it doesn't clamp the real value. */
export function ZIndexField({ value, onChange }: ZIndexFieldProps) {
    const sliderValue = Math.min(Math.max(value ?? 0, 0), SNAP_MAX)

    return (
        <div className="zindex-field">
            <NumberField value={value} onChange={onChange} showCarets dim={value == null} />
            <div className="zindex-slider">
                <input
                    type="range"
                    min={0}
                    max={SNAP_MAX}
                    step={1}
                    value={sliderValue}
                    onChange={(event) => onChange(Number(event.currentTarget.value))}
                />
                <div className="zindex-slider-dots">
                    {Array.from({ length: SNAP_MAX + 1 }, (_, i) => (
                        <span key={i} className={i <= sliderValue ? "zindex-slider-dot is-filled" : "zindex-slider-dot"} />
                    ))}
                </div>
            </div>
        </div>
    )
}
