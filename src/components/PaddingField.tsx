import { useState } from "react"
import { NumberField } from "./NumberField"
import "./PaddingField.css"

interface PaddingFieldProps {
    value: string | null
    onChange: (value: string) => void
}

interface Sides {
    top: number
    right: number
    bottom: number
    left: number
}

function parsePadding(raw: string | null): Sides {
    if (typeof raw !== "string") return { top: 0, right: 0, bottom: 0, left: 0 }
    const parts = raw
        .trim()
        .split(/\s+/)
        .map((part) => Number.parseFloat(part) || 0)
    if (parts.length === 4) return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] }
    if (parts.length === 2) return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] }
    if (parts.length === 1) return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] }
    return { top: 0, right: 0, bottom: 0, left: 0 }
}

/** The SDK's `padding` type only has a 1-value ("16px") or 4-value
 *  ("8px 16px 8px 16px") shorthand — no native 2-value form — so a symmetric
 *  vertical/horizontal edit always serializes out to the full 4-value string. */
function serializePadding(sides: Sides): string {
    const { top, right, bottom, left } = sides
    if (top === right && right === bottom && bottom === left) return `${top}px`
    return `${top}px ${right}px ${bottom}px ${left}px`
}

function isAxisUniform(sides: Sides): boolean {
    return sides.top === sides.bottom && sides.left === sides.right
}

function ExpandIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
            <path d="M1 4.5h12M1 9.5h12M4.5 1v12M9.5 1v12" stroke="currentColor" strokeWidth="1" opacity="0.7" />
        </svg>
    )
}

/** Padding editor mirroring Framer's own: collapsed to Vertical/Horizontal by
 *  default, expandable to four independent sides via the toggle button. Starts
 *  expanded if the incoming value already has asymmetric sides (e.g. a preset
 *  captured from a node with per-side padding), collapsed otherwise. */
export function PaddingField({ value, onChange }: PaddingFieldProps) {
    const sides = parsePadding(value)
    const [expanded, setExpanded] = useState(() => !isAxisUniform(sides))

    const setSide = (key: keyof Sides, next: number) => {
        onChange(serializePadding({ ...sides, [key]: next }))
    }

    const setAxis = (axis: "vertical" | "horizontal", next: number) => {
        if (axis === "vertical") onChange(serializePadding({ ...sides, top: next, bottom: next }))
        else onChange(serializePadding({ ...sides, left: next, right: next }))
    }

    return (
        <div className="padding-field">
            {expanded ? (
                <div className="padding-field-sides">
                    <NumberField value={sides.left} leftLabel="L" unit="px" showCarets onChange={(next) => setSide("left", next)} />
                    <NumberField value={sides.top} leftLabel="T" unit="px" showCarets onChange={(next) => setSide("top", next)} />
                    <NumberField value={sides.right} leftLabel="R" unit="px" showCarets onChange={(next) => setSide("right", next)} />
                    <NumberField value={sides.bottom} leftLabel="B" unit="px" showCarets onChange={(next) => setSide("bottom", next)} />
                </div>
            ) : (
                <div className="padding-field-axes">
                    <NumberField value={sides.left} leftLabel="H" unit="px" showCarets onChange={(next) => setAxis("horizontal", next)} />
                    <NumberField value={sides.top} leftLabel="V" unit="px" showCarets onChange={(next) => setAxis("vertical", next)} />
                </div>
            )}
            <button
                type="button"
                className={expanded ? "padding-field-toggle is-active" : "padding-field-toggle"}
                onClick={() => setExpanded((prev) => !prev)}
                aria-label={expanded ? "Use vertical/horizontal padding" : "Edit each side individually"}
                title={expanded ? "Use vertical/horizontal padding" : "Edit each side individually"}
            >
                <ExpandIcon />
            </button>
        </div>
    )
}
