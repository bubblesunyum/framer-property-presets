import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import "./Dropdown.css"

export interface DropdownOption {
    value: string
    label: string
    /** Shown on the closed trigger instead of `label` — keeps a long label (e.g.
     *  "Relative") from being clipped in the compact collapsed control. The open list
     *  always shows the full `label`. Falls back to `label` when omitted. */
    shortLabel?: string
}

interface DropdownProps {
    value: string | null
    options: DropdownOption[]
    onChange: (value: string | null) => void
    /** Renders a clearing entry at the top of the list — omit for a required field. */
    nullable?: boolean
    nullLabel?: string
}

function ChevronIcon() {
    return (
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="dropdown-chevron">
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

/** Custom single-select dropdown — used instead of a native `<select>` wherever an
 *  option's full label (e.g. "Relative") would otherwise get clipped in a compact
 *  closed control. The trigger shows each option's short label; the portaled open
 *  list (positioned from the trigger's rect, same approach as Tooltip/PresetMenu)
 *  always shows the full label. */
export function Dropdown({ value, options, onChange, nullable, nullLabel = "None" }: DropdownProps) {
    const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    const isOpen = position !== null

    const close = () => setPosition(null)

    const open = () => {
        const rect = triggerRef.current?.getBoundingClientRect()
        if (!rect) return
        setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }

    useEffect(() => {
        if (!isOpen) return
        // Move focus onto the current option so keyboard users can arrow through the list.
        const active = listRef.current?.querySelector<HTMLButtonElement>(".dropdown-option.is-active")
        ;(active ?? listRef.current?.querySelector<HTMLButtonElement>(".dropdown-option"))?.focus()
        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node
            if (listRef.current?.contains(target) || triggerRef.current?.contains(target)) return
            close()
        }
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                close()
                triggerRef.current?.focus()
            }
        }
        window.addEventListener("mousedown", handlePointerDown)
        window.addEventListener("keydown", handleKeyDown)
        return () => {
            window.removeEventListener("mousedown", handlePointerDown)
            window.removeEventListener("keydown", handleKeyDown)
        }
    }, [isOpen])

    const handleListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
        event.preventDefault()
        const options = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>(".dropdown-option") ?? [])
        if (options.length === 0) return
        const currentIndex = options.indexOf(document.activeElement as HTMLButtonElement)
        const delta = event.key === "ArrowDown" ? 1 : -1
        const nextIndex = (currentIndex + delta + options.length) % options.length
        options[nextIndex]?.focus()
    }

    const current = options.find((option) => option.value === value)
    const triggerLabel = current ? (current.shortLabel ?? current.label) : nullLabel

    return (
        <div className="dropdown">
            <button
                type="button"
                ref={triggerRef}
                className="dropdown-trigger"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                onClick={() => (isOpen ? close() : open())}
            >
                <span className="dropdown-trigger-label">{triggerLabel}</span>
                <ChevronIcon />
            </button>
            {position &&
                createPortal(
                    <div
                        ref={listRef}
                        className="dropdown-list"
                        role="listbox"
                        onKeyDown={handleListKeyDown}
                        style={{ top: position.top, left: position.left, minWidth: position.width }}
                    >
                        {nullable && (
                            <button
                                type="button"
                                role="option"
                                aria-selected={value === null}
                                className={value === null ? "dropdown-option is-active" : "dropdown-option"}
                                onClick={() => {
                                    onChange(null)
                                    close()
                                }}
                            >
                                {nullLabel}
                            </button>
                        )}
                        {options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={option.value === value}
                                className={option.value === value ? "dropdown-option is-active" : "dropdown-option"}
                                onClick={() => {
                                    onChange(option.value)
                                    close()
                                }}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>,
                    document.body
                )}
        </div>
    )
}
