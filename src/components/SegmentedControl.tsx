import type { IconSet } from "../schema/propertySchema"
import "./SegmentedControl.css"

interface Option {
    value: string
    label: string
    /** Kept visible but non-interactive and grayed further than a normal unselected
     *  option — for a mode that doesn't apply to the current context (e.g. Fill/Fit on
     *  a Min/Max constraint field) rather than hiding it outright. */
    disabled?: boolean
}

interface SegmentedControlProps {
    value: string | null
    onChange: (value: string) => void
    options: Option[]
    /** Omit for a text-label control (renders each option's label as text). */
    iconSet?: IconSet
}

function FlowIcon({ value }: { value: string }) {
    // Row/Column read as a plain left-right / up-down double-headed arrow — the two
    // boxes case below (grid/none) is unambiguous enough without needing arrows.
    if (value === "row") {
        return (
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
    if (value === "column") {
        return (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                    d="M8 1.5v13M8 1.5 5.2 4.3M8 1.5l2.8 2.8M8 14.5 5.2 11.7M8 14.5l2.8-2.8"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
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

function PositionIcon({ value }: { value: string }) {
    if (value === "absolute") {
        return (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
                <path d="M5 2.5v3.5M2.5 5h3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <circle cx="5" cy="5" r="1.6" fill="currentColor" />
            </svg>
        )
    }
    if (value === "fixed") {
        return (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="8" cy="8" r="2.2" fill="currentColor" />
            </svg>
        )
    }
    if (value === "sticky") {
        return (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2.5" y="2.5" width="11" height="2.4" rx="1" fill="currentColor" />
                <path
                    d="M8 13.5V7M8 7 5.6 9.4M8 7l2.4 2.4"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        )
    }
    // relative — nested inside its parent's flow
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
            <rect x="4.5" y="4.5" width="4.5" height="4.5" rx="1" fill="currentColor" />
        </svg>
    )
}

function OverflowIcon({ value }: { value: string }) {
    if (value === "hidden") {
        return (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
            </svg>
        )
    }
    if (value === "auto") {
        return (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
                <rect x="11.2" y="4" width="1.6" height="8" rx="0.8" fill="currentColor" />
            </svg>
        )
    }
    if (value === "clip") {
        return (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 2h4v1.6H3.6V6H2V2z" fill="currentColor" />
                <path d="M14 14h-4v-1.6h2.4V10H14v4z" fill="currentColor" />
                <rect x="4.5" y="4.5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.3" />
            </svg>
        )
    }
    // visible — content pokes out past the bounds
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <rect x="6.5" y="6.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" opacity="0.45" />
        </svg>
    )
}

function PointerEventsIcon({ value }: { value: string }) {
    if (value === "none") {
        return (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                    d="M5 2.5 5.6 11l2-1.7 1.4 3 1.4-.6-1.4-3 2.6-.4L5 2.5z"
                    stroke="currentColor"
                    strokeWidth="1.1"
                    strokeLinejoin="round"
                    opacity="0.45"
                />
                <path d="M2.5 2.5l11 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
        )
    }
    // auto — a plain cursor/pointer, clickable
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M5 2.5 5.6 11l2-1.7 1.4 3 1.4-.6-1.4-3 2.6-.4L5 2.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
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
    if (iconSet === "position") return <PositionIcon value={value} />
    if (iconSet === "overflow") return <OverflowIcon value={value} />
    if (iconSet === "pointer-events") return <PointerEventsIcon value={value} />
    return <DistributionIcon value={value} />
}

export function SegmentedControl({ value, onChange, options, iconSet }: SegmentedControlProps) {
    return (
        <div className={iconSet ? "segmented-control" : "segmented-control is-text"} role="radiogroup">
            {options.map((option) => {
                const isActive = value === option.value
                const classes = ["segmented-option"]
                if (isActive) classes.push("is-active")
                if (option.disabled) classes.push("is-disabled")
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        aria-disabled={option.disabled}
                        title={option.label}
                        className={classes.join(" ")}
                        onClick={() => !option.disabled && onChange(option.value)}
                    >
                        {iconSet ? <Icon iconSet={iconSet} value={option.value} /> : <span>{option.label}</span>}
                    </button>
                )
            })}
        </div>
    )
}
