import type { PropertyDescriptor } from "../schema/propertySchema"
import { AlignmentGrid, type AlignmentValue } from "./AlignmentGrid"
import { Dropdown } from "./Dropdown"
import { LengthField } from "./LengthField"
import { NumberField } from "./NumberField"
import { PaddingField } from "./PaddingField"
import "./PropertyRow.css"
import { SegmentedControl } from "./SegmentedControl"
import { TextField } from "./TextField"
import { ToggleSwitch } from "./ToggleSwitch"
import { ZIndexField } from "./ZIndexField"

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
    /** Live-only: the parent's content size along this axis (px), used to convert px↔%
     *  on a unit switch (Width/Height only). Absent in edit mode. */
    parentPx?: number | null
    /** Live-only: the canvas viewport size along this axis (px), used to convert to vh
     *  (Height only). Absent in edit mode. */
    viewportPx?: number | null
}

const PIN_KEYS = new Set(["top", "right", "bottom", "left"])

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

/** A compact number field doesn't stretch to fill its row, leaving dead space to its
 *  right — clicking that space should still activate the field rather than doing
 *  nothing. Only acts when the click landed on the wrapper itself (empty space), not on
 *  a nested control the click already reached natively. */
function activateNestedFieldOnEmptyClick(event: React.MouseEvent<HTMLElement>) {
    if (event.target !== event.currentTarget) return
    const input = event.currentTarget.querySelector<HTMLInputElement>(".number-field-input")
    input?.focus()
    input?.select()
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
                    // Radius is a solo full-width row, capped narrow rather than
                    // stretching all the way across. Gap sits beside Padding in the
                    // dedicated GapPaddingRow layout (see PropertySections.tsx) — it gets
                    // a wider compact cap there so Padding's own box still gets most of
                    // the row's width.
                    compact={descriptor.key === "radius" || descriptor.key === "gap"}
                    maxWidthPx={descriptor.key === "gap" ? 108 : undefined}
                    dim={value == null}
                    accentLabel={PIN_KEYS.has(descriptor.key)}
                    dragSensitivity={descriptor.key === "radius" ? 0.4 : 1}
                    onChange={(next) => onChange(`${next}${descriptor.unit}`)}
                />
            )
        case "size-length":
            return (
                <LengthField
                    value={typeof value === "string" ? value : null}
                    axis={descriptor.key.toLowerCase().includes("height") ? "height" : "width"}
                    constrained={descriptor.constrained}
                    computedPx={computedPx}
                    onChange={onChange}
                />
            )
        case "number":
            return (
                <NumberField
                    value={typeof value === "number" ? value : null}
                    min={descriptor.min}
                    dim={value == null}
                    onChange={onChange}
                />
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
                <ZIndexField value={typeof value === "number" ? value : null} onChange={onChange} />
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
                    dim={value == null}
                    dragSensitivity={1.5}
                    onChange={(next) => onChange(next / 100)}
                />
            )
        }
        case "percent":
            return (
                <NumberField
                    value={typeof value === "number" ? value : null}
                    unit="%"
                    min={0}
                    max={100}
                    compact
                    onChange={onChange}
                />
            )
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
    // Padding can grow taller as it expands to 4 sides — top-align the row so the label
    // and the control's own expand button don't drift down as it grows. (Alignment used
    // to need this too, but it's now rendered full-width with its own label above it,
    // not through this labeled-row path at all.)
    const classes = ["row", "property-row"]
    if (included) classes.push("is-included")
    if (descriptor.control === "padding") classes.push("is-top")
    return (
        <div className={classes.join(" ")}>
            <label
                className={onToggleIncluded ? "property-row-label is-toggleable" : "property-row-label"}
                onClick={onToggleIncluded}
            >
                {descriptor.label}
            </label>
            <div className="property-row-control" onClick={activateNestedFieldOnEmptyClick}>
                {renderControl(descriptor, value, onChange, computedPx)}
            </div>
        </div>
    )
}

/** Bare control with no label at all — for bespoke layouts (the Position cross) where
 *  the field's identity is already conveyed some other way (e.g. an inline suffix). */
export function PropertyControlOnly({ descriptor, value, included, onChange, computedPx }: FieldProps) {
    return (
        <div className={included ? "control-only is-included" : "control-only"} onClick={activateNestedFieldOnEmptyClick}>
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
