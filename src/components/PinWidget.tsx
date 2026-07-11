import "./PinWidget.css"

interface PinWidgetProps {
    top: boolean
    right: boolean
    bottom: boolean
    left: boolean
}

/** Visual read-out of which edges are pinned — mirrors the little cross-shaped
 *  indicator in Framer's own Position panel. Read-only: the four number fields
 *  around it (not this widget) remain the actual editable controls. */
export function PinWidget({ top, right, bottom, left }: PinWidgetProps) {
    const activeStroke = "var(--position-accent)"
    const inactiveStroke = "var(--framer-color-text-tertiary)"

    return (
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" className="pin-widget" aria-hidden="true" focusable="false">
            <line x1="4" y1="28" x2="20" y2="28" stroke={left ? activeStroke : inactiveStroke} strokeWidth="1.5" opacity={left ? 1 : 0.4} />
            <line x1="4" y1="24" x2="4" y2="32" stroke={left ? activeStroke : inactiveStroke} strokeWidth="1.5" opacity={left ? 1 : 0.4} />

            <line x1="36" y1="28" x2="52" y2="28" stroke={right ? activeStroke : inactiveStroke} strokeWidth="1.5" opacity={right ? 1 : 0.4} />
            <line x1="52" y1="24" x2="52" y2="32" stroke={right ? activeStroke : inactiveStroke} strokeWidth="1.5" opacity={right ? 1 : 0.4} />

            <line x1="28" y1="4" x2="28" y2="20" stroke={top ? activeStroke : inactiveStroke} strokeWidth="1.5" opacity={top ? 1 : 0.4} />
            <line x1="24" y1="4" x2="32" y2="4" stroke={top ? activeStroke : inactiveStroke} strokeWidth="1.5" opacity={top ? 1 : 0.4} />

            <line x1="28" y1="36" x2="28" y2="52" stroke={bottom ? activeStroke : inactiveStroke} strokeWidth="1.5" opacity={bottom ? 1 : 0.4} />
            <line x1="24" y1="52" x2="32" y2="52" stroke={bottom ? activeStroke : inactiveStroke} strokeWidth="1.5" opacity={bottom ? 1 : 0.4} />

            <rect
                x="20"
                y="20"
                width="16"
                height="16"
                rx="3"
                fill="var(--framer-color-bg-tertiary)"
                stroke="var(--framer-color-divider)"
            />
        </svg>
    )
}
