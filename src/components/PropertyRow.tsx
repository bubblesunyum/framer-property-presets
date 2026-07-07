import type { PropertyDescriptor } from "../schema/propertySchema"
import { AlignmentGrid, type AlignmentValue } from "./AlignmentGrid"
import { Dropdown } from "./Dropdown"
import { LengthField } from "./LengthField"
import { NumberField } from "./NumberField"
import { NumberStepper } from "./NumberStepper"
import { PaddingField } from "./PaddingField"
import "./PropertyRow.css"
import { SegmentedControl } from "./SegmentedControl"
import { TextField } from "./TextField"
import { ToggleSwitch } from "./ToggleSwitch"

export interface FieldProps {
    descriptor: PropertyDescriptor
    value: unknown
    included: boolean
    onChange: (value: unknown) => void
    /** Edit mode only: clicking the label toggles this field out of/into the preset.
     *  Omitted in create mode, where inclusion is inferred instead (see PresetEditor). */
    onToggleIncluded?: () => void
    /** Live-only: the node's actual rendered pixel size, shown (disabled) in place of a
     *  real value for Width/Height while their mode is "Fit" — see LengthField. Absent
     *  in edit mode, where there's no live node to measure. */
    computedPx?: number | null
}

const YES_NO_OPTIONS = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
]

function parseNumeric(raw: unknown): number | null {
    if (typeof raw === "number") return raw
    if (typeof raw === "string") {
        const parsed = Number.parseFloat(raw)
        return Number.isNaN(parsed) ? null : parsed
    }
    return null
}

export function renderControl(
    descriptor: PropertyDescriptor,
    value: unknown,
    onChange: (value: unknown) => void,
    computedPx?: number | null
) {
    switch (descriptor.control) {
        case "dimension":
            return (
                <NumberField
                    value={parseNumeric(value)}
                    unit={descriptor.unit}
                    leftLabel={descriptor.displaySuffix}
                    // A plain dimension (no side label — gap, radius) is capped narrow so
                    // it doesn't stretch to fill its row; side-labelled ones (pins) size
                    // via their own cross/pair layout instead.
                    compact={!descriptor.displaySuffix}
                    onChange={(next) => onChange(`${next}${descriptor.unit}`)}
                />
            )
        case "size-length":
            return (
                <LengthField
                    value={typeof value === "string" ? value : null}
                    constrained={descriptor.constrained}
                    computedPx={computedPx}
                    onChange={onChange}
                />
            )
        case "number":
            return (
                <NumberField value={typeof value === "number" ? value : null} min={descriptor.min} onChange={onChange} />
            )
        case "length":
            return (
                <TextField
                    value={typeof value === "string" ? value : ""}
                    placeholder={descriptor.placeholder}
                    onChange={onChange}
                />
            )
        case "padding":
            return <PaddingField value={typeof value === "string" ? value : null} onChange={onChange} />
        case "boolean":
            return (
                <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(event) => onChange(event.currentTarget.checked)}
                />
            )
        case "toggle":
            return <ToggleSwitch checked={Boolean(value)} onChange={onChange} />
        case "stepper":
            return (
                <NumberStepper
                    value={typeof value === "number" ? value : null}
                    min={descriptor.min}
                    max={descriptor.max}
                    onChange={onChange}
                />
            )
        case "opacity": {
            // Stored as a plain 0–1 fraction; shown/edited as a 0–100 percentage.
            const percent = typeof value === "number" ? Math.round(value * 100) : null
            return (
                <NumberField
                    value={percent}
                    unit="%"
                    min={0}
                    max={100}
                    compact
                    onChange={(next) => onChange(next / 100)}
                />
            )
        }
        case "yes-no":
            return (
                <SegmentedControl
                    options={YES_NO_OPTIONS}
                    value={value === true ? "yes" : value === false ? "no" : null}
                    onChange={(next) => onChange(next === "yes")}
                />
            )
        case "align-grid":
            // `value` is the composite {direction, distribution, alignment} assembled in
            // buildFieldProps; onChange sends back the two stack keys the grid resolved.
            return <AlignmentGrid value={value as AlignmentValue} onChange={onChange} />
        case "select":
            return (
                <Dropdown
                    value={typeof value === "string" ? value : null}
                    options={descriptor.options}
                    onChange={onChange}
                    nullable={descriptor.nullable}
                />
            )
        case "segmented": {
            // "none" is a stand-in for the underlying `null` value (e.g. freeform
            // layout) — only meaningful for descriptors whose options include it.
            const currentValue = value === null ? "none" : typeof value === "string" ? value : null
            return (
                <SegmentedControl
                    iconSet={descriptor.iconSet}
                    options={descriptor.options}
                    value={currentValue}
                    onChange={(next) => onChange(next === "none" ? null : next)}
                />
            )
        }
    }
}

/** Full-width row: label on the left, control filling the rest — for properties that
 *  don't naturally pair with a neighbor. Dims when not (yet) included, rather than
 *  showing a separate include/exclude checkbox. */
export function PropertyRow({ descriptor, value, included, onChange, onToggleIncluded, computedPx }: FieldProps) {
    // Padding/Alignment can grow taller as they expand — top-align the row so the label
    // and the control's own top-row chrome (expand button, settings icon) don't drift
    // down as they open/grow.
    const classes = ["row", "property-row"]
    if (included) classes.push("is-included")
    if (descriptor.control === "padding" || descriptor.control === "align-grid") classes.push("is-top")
    return (
        <div className={classes.join(" ")}>
            <label
                className={onToggleIncluded ? "property-row-label is-toggleable" : "property-row-label"}
                onClick={onToggleIncluded}
            >
                {descriptor.label}
            </label>
            <div className="property-row-control">{renderControl(descriptor, value, onChange, computedPx)}</div>
        </div>
    )
}

/** Bare control with no label at all — for bespoke layouts (the Position cross) where
 *  the field's identity is already conveyed some other way (e.g. an inline suffix). */
export function PropertyControlOnly({ descriptor, value, included, onChange, computedPx }: FieldProps) {
    return (
        <div className={included ? "control-only is-included" : "control-only"}>
            {renderControl(descriptor, value, onChange, computedPx)}
        </div>
    )
}

/** Compact field for side-by-side pairs (Left/Top, Width/Height, and so on) — label
 *  sits above the control instead of beside it, so two comfortably fit one row. */
export function PropertyMiniField({ descriptor, value, included, onChange, onToggleIncluded, computedPx }: FieldProps) {
    return (
        <div className={included ? "mini-field is-included" : "mini-field"}>
            <label
                className={onToggleIncluded ? "mini-field-label is-toggleable" : "mini-field-label"}
                onClick={onToggleIncluded}
            >
                {descriptor.label}
            </label>
            {renderControl(descriptor, value, onChange, computedPx)}
        </div>
    )
}

/** Renders two related fields side by side when both apply to this node; falls back
 *  to a normal full-width row when only one half of the pair is actually present. */
export function PropertyFieldPair({ left, right }: { left: FieldProps | null; right: FieldProps | null }) {
    if (left && right) {
        return (
            <div className="mini-field-pair">
                <PropertyMiniField {...left} />
                <PropertyMiniField {...right} />
            </div>
        )
    }
    const solo = left ?? right
    return solo ? <PropertyRow {...solo} /> : null
}

/** Two side-by-side columns, each stacking its fields vertically — e.g. Width/Min
 *  Width/Max Width beside Height/Min Height/Max Height, matching Framer's own
 *  Resizing panel. An empty column (nothing in it applies to this node) collapses to
 *  nothing rather than leaving a blank gap. */
export function PropertyColumnPair({ left, right }: { left: FieldProps[]; right: FieldProps[] }) {
    if (left.length === 0 && right.length === 0) return null
    return (
        <div className="mini-field-pair">
            <div className="mini-field-column">
                {left.map((field) => (
                    <PropertyMiniField key={field.descriptor.key} {...field} />
                ))}
            </div>
            <div className="mini-field-column">
                {right.map((field) => (
                    <PropertyMiniField key={field.descriptor.key} {...field} />
                ))}
            </div>
        </div>
    )
}
