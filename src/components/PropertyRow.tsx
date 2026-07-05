import type { PropertyDescriptor } from "../schema/propertySchema"
import { Dropdown } from "./Dropdown"
import { LengthField } from "./LengthField"
import { NumberField } from "./NumberField"
import "./PropertyRow.css"
import { SegmentedControl } from "./SegmentedControl"
import { TextField } from "./TextField"

export interface FieldProps {
    descriptor: PropertyDescriptor
    value: unknown
    included: boolean
    onChange: (value: unknown) => void
    /** Edit mode only: clicking the label toggles this field out of/into the preset.
     *  Omitted in create mode, where inclusion is inferred instead (see PresetEditor). */
    onToggleIncluded?: () => void
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

function renderControl(descriptor: PropertyDescriptor, value: unknown, onChange: (value: unknown) => void) {
    switch (descriptor.control) {
        case "dimension":
            return (
                <NumberField
                    value={parseNumeric(value)}
                    unit={descriptor.displaySuffix ?? descriptor.unit}
                    onChange={(next) => onChange(`${next}${descriptor.unit}`)}
                />
            )
        case "size-length":
            return <LengthField value={typeof value === "string" ? value : null} onChange={onChange} />
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
        case "boolean":
            return (
                <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(event) => onChange(event.currentTarget.checked)}
                />
            )
        case "clip-toggle":
            return (
                <input
                    type="checkbox"
                    checked={value === "hidden" || value === "clip"}
                    onChange={(event) => onChange(event.currentTarget.checked ? "hidden" : "visible")}
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
export function PropertyRow({ descriptor, value, included, onChange, onToggleIncluded }: FieldProps) {
    return (
        <div className={included ? "row property-row is-included" : "row property-row"}>
            <label
                className={onToggleIncluded ? "property-row-label is-toggleable" : "property-row-label"}
                onClick={onToggleIncluded}
            >
                {descriptor.label}
            </label>
            <div className="property-row-control">{renderControl(descriptor, value, onChange)}</div>
        </div>
    )
}

/** Bare control with no label at all — for bespoke layouts (the Position cross) where
 *  the field's identity is already conveyed some other way (e.g. an inline suffix). */
export function PropertyControlOnly({ descriptor, value, included, onChange }: FieldProps) {
    return <div className={included ? "control-only is-included" : "control-only"}>{renderControl(descriptor, value, onChange)}</div>
}

/** Compact field for side-by-side pairs (Left/Top, Width/Height, and so on) — label
 *  sits above the control instead of beside it, so two comfortably fit one row. */
export function PropertyMiniField({ descriptor, value, included, onChange, onToggleIncluded }: FieldProps) {
    return (
        <div className={included ? "mini-field is-included" : "mini-field"}>
            <label
                className={onToggleIncluded ? "mini-field-label is-toggleable" : "mini-field-label"}
                onClick={onToggleIncluded}
            >
                {descriptor.label}
            </label>
            {renderControl(descriptor, value, onChange)}
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
