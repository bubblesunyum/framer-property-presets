import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import "./PresetMenu.css"

export interface MenuAction {
    key: string
    label: string
    onClick: () => void
    disabled?: boolean
    disabledReason?: string
    danger?: boolean
}

export type MenuEntry = MenuAction | "separator"

interface PresetMenuProps {
    items: MenuEntry[]
    onOpenChange?: (open: boolean) => void
}

function DotsIcon() {
    return (
        <svg width="16" height="4" viewBox="0 0 16 4" fill="none">
            <circle cx="2" cy="2" r="1.6" fill="currentColor" />
            <circle cx="8" cy="2" r="1.6" fill="currentColor" />
            <circle cx="14" cy="2" r="1.6" fill="currentColor" />
        </svg>
    )
}

/** Horizontal three-dot overflow menu. Portaled to `document.body` and positioned
 *  from the trigger's on-screen rect (same reasoning as Tooltip) so it isn't clipped
 *  by the scrollable preset list. */
export function PresetMenu({ items, onOpenChange }: PresetMenuProps) {
    const [position, setPosition] = useState<{ top: number; right: number } | null>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    const isOpen = position !== null

    const setOpen = (open: boolean) => {
        if (!open) {
            setPosition(null)
            onOpenChange?.(false)
            return
        }
        const rect = buttonRef.current?.getBoundingClientRect()
        if (!rect) return
        setPosition({ top: rect.bottom + 6, right: window.innerWidth - rect.right })
        onOpenChange?.(true)
    }

    useEffect(() => {
        if (!isOpen) return
        // Move focus into the menu when it opens so keyboard users land on an actionable
        // item (and can then arrow between them / Escape back out).
        menuRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus()
        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node
            if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return
            setOpen(false)
        }
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpen(false)
                buttonRef.current?.focus()
            }
        }
        window.addEventListener("mousedown", handlePointerDown)
        window.addEventListener("keydown", handleKeyDown)
        return () => {
            window.removeEventListener("mousedown", handlePointerDown)
            window.removeEventListener("keydown", handleKeyDown)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    // Roving focus between menu items with the arrow keys.
    const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
        event.preventDefault()
        const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])
        if (items.length === 0) return
        const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement)
        const delta = event.key === "ArrowDown" ? 1 : -1
        const nextIndex = (currentIndex + delta + items.length) % items.length
        items[nextIndex]?.focus()
    }

    return (
        <>
            <button
                type="button"
                ref={buttonRef}
                className="preset-menu-trigger"
                aria-label="More options"
                aria-haspopup="menu"
                aria-expanded={isOpen}
                onClick={(event) => {
                    event.stopPropagation()
                    setOpen(!isOpen)
                }}
            >
                <DotsIcon />
            </button>
            {position &&
                createPortal(
                    <div
                        ref={menuRef}
                        className="preset-menu"
                        role="menu"
                        style={{ top: position.top, right: position.right }}
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={handleMenuKeyDown}
                    >
                        {items.map((item, index) =>
                            item === "separator" ? (
                                <div key={`separator-${index}`} className="preset-menu-separator" />
                            ) : (
                                <button
                                    key={item.key}
                                    type="button"
                                    role="menuitem"
                                    className={item.danger ? "preset-menu-item is-danger" : "preset-menu-item"}
                                    disabled={item.disabled}
                                    title={item.disabled ? item.disabledReason : undefined}
                                    onClick={item.onClick}
                                >
                                    {item.label}
                                </button>
                            )
                        )}
                    </div>,
                    document.body
                )}
        </>
    )
}
