import { useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import "./Tooltip.css"

interface TooltipProps {
    content: string
    children: ReactNode
    className?: string
}

interface TooltipPosition {
    top: number
    left: number
    placement: "above" | "below"
}

/** Wraps its trigger in a span that owns the hover listeners rather than relying on
 *  the trigger itself — disabled `<button>`s don't reliably fire mouse events in every
 *  browser, and every current use of this is explaining why something is disabled.
 *
 *  The bubble itself is portaled to `document.body` and positioned from the anchor's
 *  viewport rect rather than plain CSS `position: absolute` — this list lives inside a
 *  scrollable container, and a plain absolutely-positioned bubble gets clipped by that
 *  container's own bounds whenever it pops outside them (e.g. above a row near the top
 *  of the scroll area). */
export function Tooltip({ content, children, className }: TooltipProps) {
    const anchorRef = useRef<HTMLSpanElement>(null)
    const [position, setPosition] = useState<TooltipPosition | null>(null)

    const show = () => {
        const rect = anchorRef.current?.getBoundingClientRect()
        if (!rect) return
        const placement = rect.top < 48 ? "below" : "above"
        setPosition({
            top: placement === "above" ? rect.top - 8 : rect.bottom + 8,
            left: rect.left + rect.width / 2,
            placement,
        })
    }

    const hide = () => setPosition(null)

    return (
        <span
            ref={anchorRef}
            className={className ? `tooltip-anchor ${className}` : "tooltip-anchor"}
            onMouseEnter={show}
            onMouseLeave={hide}
        >
            {children}
            {position &&
                createPortal(
                    <span
                        className="tooltip-bubble"
                        style={{
                            top: position.top,
                            left: position.left,
                            transform: `translate(-50%, ${position.placement === "above" ? "-100%" : "0"})`,
                        }}
                    >
                        {content}
                    </span>,
                    document.body
                )}
        </span>
    )
}
