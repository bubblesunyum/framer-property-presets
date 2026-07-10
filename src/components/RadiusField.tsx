import { useState } from "react"
import { NumberField } from "./NumberField"
import "./RadiusField.css"

interface RadiusFieldProps {
    value: string | null
    onChange: (value: string) => void
    onClear?: () => void
}

interface Corners {
    topLeft: number
    topRight: number
    bottomRight: number
    bottomLeft: number
}

function parseRadius(raw: string | null): Corners {
    if (typeof raw !== "string") return { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 }
    const parts = raw
        .trim()
        .split(/\s+/)
        .map((part) => Number.parseFloat(part) || 0)
    if (parts.length === 4) return { topLeft: parts[0], topRight: parts[1], bottomRight: parts[2], bottomLeft: parts[3] }
    if (parts.length === 1) return { topLeft: parts[0], topRight: parts[0], bottomRight: parts[0], bottomLeft: parts[0] }
    return { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 }
}

/** The SDK's `borderRadius` type only has a 1-value ("8px") or 4-value ("8px 8px 8px
 *  8px", CSS's top-left/top-right/bottom-right/bottom-left order) shorthand — no
 *  native 2-value form — so a uniform edit always serializes to the single-value form. */
function serializeRadius(corners: Corners): string {
    const { topLeft, topRight, bottomRight, bottomLeft } = corners
    if (topLeft === topRight && topRight === bottomRight && bottomRight === bottomLeft) return `${topLeft}px`
    return `${topLeft}px ${topRight}px ${bottomRight}px ${bottomLeft}px`
}

function isUniform(corners: Corners): boolean {
    return corners.topLeft === corners.topRight && corners.topRight === corners.bottomRight && corners.bottomRight === corners.bottomLeft
}

function ExpandIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
            <path d="M1 4.5h12M1 9.5h12M4.5 1v12M9.5 1v12" stroke="currentColor" strokeWidth="1" opacity="0.7" />
        </svg>
    )
}

/** Radius editor mirroring PaddingField's expand behavior, but the all-corner field
 *  and its toggle button stay put — expanding reveals the four corner fields in a row
 *  underneath rather than replacing the main field, so the button doesn't jump. Starts
 *  expanded if the incoming value already has asymmetric corners (e.g. a preset
 *  captured from a node with per-corner radius), collapsed otherwise; toggling only
 *  shows/hides the breakdown row and never itself changes the value. */
export function RadiusField({ value, onChange, onClear }: RadiusFieldProps) {
    const corners = parseRadius(value)
    const uniform = isUniform(corners)
    const [expanded, setExpanded] = useState(() => value != null && !uniform)

    const setCorner = (key: keyof Corners, next: number) => {
        onChange(serializeRadius({ ...corners, [key]: next }))
    }

    return (
        <div className="radius-field">
            <div className="radius-field-main">
                <NumberField
                    value={value == null || !uniform ? null : corners.topLeft}
                    unit="px"
                    compact
                    dim={value == null || !uniform}
                    dragSensitivity={0.4}
                    onChange={(next) => onChange(`${next}px`)}
                    onClear={onClear}
                />
                <button
                    type="button"
                    className={expanded ? "radius-field-toggle is-active" : "radius-field-toggle"}
                    onClick={() => setExpanded((prev) => !prev)}
                    aria-label={expanded ? "Hide individual corners" : "Edit each corner individually"}
                    title={expanded ? "Hide individual corners" : "Edit each corner individually"}
                >
                    <ExpandIcon />
                </button>
            </div>
            {expanded && (
                <div className="radius-field-corners">
                    <NumberField value={corners.topLeft} leftLabel="TL" unit="px" onChange={(next) => setCorner("topLeft", next)} />
                    <NumberField value={corners.topRight} leftLabel="TR" unit="px" onChange={(next) => setCorner("topRight", next)} />
                    <NumberField value={corners.bottomLeft} leftLabel="BL" unit="px" onChange={(next) => setCorner("bottomLeft", next)} />
                    <NumberField value={corners.bottomRight} leftLabel="BR" unit="px" onChange={(next) => setCorner("bottomRight", next)} />
                </div>
            )}
        </div>
    )
}
