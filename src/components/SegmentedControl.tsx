import type { IconSet } from "../schema/propertySchema"
import "./SegmentedControl.css"

interface Option {
    value: string
    label: string
}

interface SegmentedControlProps {
    value: string | null
    onChange: (value: string) => void
    options: Option[]
    /** Omit for a text-label control (renders each option's label as text). */
    iconSet?: IconSet
}

function FlowIcon({ value }: { value: string }) {
    if (value === "stack") {
        return (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2.5" width="12" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
                <rect x="2" y="10" width="12" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
            </svg>
        )
    }
    if (value === "grid") {
        return (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
                <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
                <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
                <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
            </svg>
        )
    }
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" opacity="0.5" />
            <rect x="9.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" opacity="0.9" />
        </svg>
    )
}

function DirectionIcon({ value }: { value: string }) {
    return value === "vertical" ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
                d="M8 1.5v13M8 1.5 5.2 4.3M8 1.5l2.8 2.8M8 14.5 5.2 11.7M8 14.5l2.8-2.8"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
                d="M1.5 8h13M1.5 8l2.8-2.8M1.5 8l2.8 2.8M14.5 8l-2.8-2.8M14.5 8l-2.8 2.8"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

const ALIGNMENT_BAR_Y: Record<string, number> = { start: 2.5, center: 6, end: 9.5 }

function AlignmentIcon({ value }: { value: string }) {
    const barY = ALIGNMENT_BAR_Y[value] ?? 6
    return (
        <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
            <rect x="1" y="1" width="14" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.1" opacity="0.4" />
            <rect x="4" y={barY} width="8" height="2" rx="1" fill="currentColor" />
        </svg>
    )
}

/** Hand-picked dot positions per distribution mode within a 24-wide track (3 dots,
 *  3px each) — there's no official Framer component for this control, so this is a
 *  deliberate approximation to be refined visually against the real app later. */
const DISTRIBUTION_DOTS: Record<string, [number, number, number]> = {
    start: [1, 6, 11],
    center: [5.5, 10.5, 15.5],
    end: [10, 15, 20],
    "space-between": [1, 10.5, 20],
    "space-around": [2.5, 10.5, 18.5],
    "space-evenly": [3.75, 10.5, 17.25],
}

function DistributionIcon({ value }: { value: string }) {
    const dots = DISTRIBUTION_DOTS[value] ?? [1, 10.5, 20]
    return (
        <svg width="24" height="14" viewBox="0 0 24 14" fill="none">
            {dots.map((x, index) => (
                <rect key={index} x={x} y="3" width="3" height="8" rx="1.5" fill="currentColor" />
            ))}
        </svg>
    )
}

function Icon({ iconSet, value }: { iconSet: NonNullable<SegmentedControlProps["iconSet"]>; value: string }) {
    if (iconSet === "direction") return <DirectionIcon value={value} />
    if (iconSet === "alignment") return <AlignmentIcon value={value} />
    if (iconSet === "flow") return <FlowIcon value={value} />
    return <DistributionIcon value={value} />
}

export function SegmentedControl({ value, onChange, options, iconSet }: SegmentedControlProps) {
    return (
        <div className="segmented-control" role="radiogroup">
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={value === option.value}
                    title={option.label}
                    className={value === option.value ? "segmented-option is-active" : "segmented-option"}
                    onClick={() => onChange(option.value)}
                >
                    {iconSet ? <Icon iconSet={iconSet} value={option.value} /> : <span>{option.label}</span>}
                </button>
            ))}
        </div>
    )
}
