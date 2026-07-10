import { useIsAllowedTo, type CanvasNode } from "framer-plugin"
import { useEffect, useRef, useState } from "react"
import { applyPresetToSelection } from "../canvas/applyPreset"
import { notify } from "../lib/notify"
import { canFitInSynced, deletePreset, movePreset } from "../storage/presetRepository"
import type { Preset } from "../types/preset"
import { type MenuEntry, PresetMenu } from "./PresetMenu"
import "./PresetListItem.css"
import { Tooltip } from "./Tooltip"

interface PresetListItemProps {
    preset: Preset
    selection: CanvasNode[]
    /** Bumped by the parent whenever any preset is created/moved/deleted, so a local
     *  preset's "does this fit in synced storage" check stays correct as the shared
     *  budget shifts. */
    refreshToken: number
    onMoved: (updated: Preset) => void
    onDeleted: (id: string) => void
    onEdit: (preset: Preset) => void
}

/** Synced to the project (remote) — a plain cloud. */
function SyncedIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
                d="M5.4 12.3h7.4a3 3 0 0 0 0-6 4.3 4.3 0 0 0-8.2-1.5A3.6 3.6 0 0 0 5.4 12.3Z"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
            />
        </svg>
    )
}

/** Saved to this device (local) — the same cloud with a slash through it ("not synced"). */
function LocalIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
                d="M5.4 12.3h7.4a3 3 0 0 0 0-6 4.3 4.3 0 0 0-8.2-1.5A3.6 3.6 0 0 0 5.4 12.3Z"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
            />
            <path d="M3 3l12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
    )
}

export function PresetListItem({ preset, selection, refreshToken, onMoved, onDeleted, onEdit }: PresetListItemProps) {
    const isAllowedToApply = useIsAllowedTo("setAttributes")
    const [status, setStatus] = useState<"idle" | "applied" | "failed">("idle")
    const [canMoveToSynced, setCanMoveToSynced] = useState(true)
    const [confirmingDelete, setConfirmingDelete] = useState(false)
    const statusTimeout = useRef<ReturnType<typeof window.setTimeout>>()

    useEffect(() => {
        if (preset.location !== "local") return
        let active = true
        void canFitInSynced(preset).then((fits) => {
            if (active) setCanMoveToSynced(fits)
        })
        return () => {
            active = false
        }
    }, [preset, refreshToken])

    useEffect(() => () => window.clearTimeout(statusTimeout.current), [])

    const applyDisabled = selection.length === 0 || !isAllowedToApply
    const moveTarget = preset.location === "synced" ? "local" : "synced"
    const moveToSyncedBlocked = preset.location === "local" && !canMoveToSynced

    const handleApply = async () => {
        if (applyDisabled) return
        const outcome = await applyPresetToSelection(preset, selection)
        const failedCount = outcome.failedNodes.length
        setStatus(outcome.appliedCount > 0 ? "applied" : "failed")

        // Give clear feedback beyond the small inline pill — especially when only some of
        // the selected layers took the preset, which the pill alone can't convey.
        if (outcome.appliedCount === 0) {
            notify(
                failedCount > 0
                    ? "Couldn't apply the preset. The layer may be locked or protected."
                    : "This preset doesn't apply to the selected layer.",
                "error"
            )
        } else if (failedCount > 0) {
            notify(`Applied to ${outcome.appliedCount} of ${selection.length} layers.`, "warning")
        }

        window.clearTimeout(statusTimeout.current)
        statusTimeout.current = window.setTimeout(() => setStatus("idle"), 1400)
    }

    const handleMove = async () => {
        if (moveTarget === "synced" && moveToSyncedBlocked) return
        const result = await movePreset(preset, moveTarget)
        if (result.ok) onMoved(result.value)
    }

    const handleDelete = async () => {
        if (!confirmingDelete) {
            setConfirmingDelete(true)
            return
        }
        await deletePreset(preset)
        onDeleted(preset.id)
    }

    const menuItems: MenuEntry[] = [
        { key: "edit", label: "Edit", onClick: () => onEdit(preset) },
        {
            key: "delete",
            label: confirmingDelete ? "Click again to delete" : "Delete",
            onClick: () => void handleDelete(),
            danger: true,
        },
        "separator",
        {
            key: "move",
            label: moveTarget === "local" ? "Move to local storage" : "Move to synced storage",
            onClick: () => void handleMove(),
            disabled: moveToSyncedBlocked,
            disabledReason: "Not enough room in Framer's synced storage — move another preset to this device to free up space.",
        },
    ]

    const row = (
        <div
            className="preset-row"
            role="button"
            tabIndex={applyDisabled ? -1 : 0}
            aria-disabled={applyDisabled}
            onClick={handleApply}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") void handleApply()
            }}
        >
            <span className="preset-row-name">{preset.name}</span>
            {status === "applied" && <span className="preset-row-status is-applied">Applied</span>}
            {status === "failed" && <span className="preset-row-status is-failed">Couldn't apply</span>}
            <Tooltip content={preset.location === "synced" ? "Synced to project" : "Saved to this device"}>
                <span className="preset-row-location-badge">
                    {preset.location === "synced" ? <SyncedIcon /> : <LocalIcon />}
                </span>
            </Tooltip>
            <span onClick={(event) => event.stopPropagation()}>
                <PresetMenu items={menuItems} onOpenChange={(open) => !open && setConfirmingDelete(false)} />
            </span>
        </div>
    )

    if (!applyDisabled) return row

    return (
        <Tooltip
            content={selection.length === 0 ? "Select a frame to apply this preset" : "Insufficient permissions"}
            className="preset-row-tooltip"
        >
            {row}
        </Tooltip>
    )
}
