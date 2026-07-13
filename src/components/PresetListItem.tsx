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
    // Moving a preset in either direction writes project plugin data (synced storage) —
    // to the cloud (local→synced) or removing the cloud copy (synced→local) — both of
    // which go through the protected `setPluginData`. Gate the action on that permission
    // so a user who can't sync doesn't see an enabled control that silently fails. This
    // is the exact identifier Framer's own example plugins use for project data writes.
    const isAllowedToSync = useIsAllowedTo("setPluginData")
    const [status, setStatus] = useState<"idle" | "applied" | "failed">("idle")
    const [canMoveToSynced, setCanMoveToSynced] = useState(true)
    const [confirmingDelete, setConfirmingDelete] = useState(false)
    const statusTimeout = useRef<ReturnType<typeof window.setTimeout>>()

    useEffect(() => {
        if (preset.location !== "local") return
        let active = true
        // canFitInSynced (via syncedStore's totalBytes) no longer rejects on a read
        // failure — it resolves to a safe "doesn't fit" instead — but this .catch() stays
        // as defense-in-depth: a fire-and-forget promise with no rejection handler here
        // would otherwise become an unhandled rejection, which main.tsx's global handler
        // turns into a full-screen error over what's really just a minor "can't move to
        // synced" affordance.
        void canFitInSynced(preset)
            .then((fits) => {
                if (active) setCanMoveToSynced(fits)
            })
            .catch((error: unknown) => {
                console.error("Failed to check synced storage budget", error)
                if (active) setCanMoveToSynced(false)
            })
        return () => {
            active = false
        }
    }, [preset, refreshToken])

    useEffect(() => () => window.clearTimeout(statusTimeout.current), [])

    const applyDisabled = selection.length === 0 || !isAllowedToApply
    const moveTarget = preset.location === "synced" ? "local" : "synced"
    // Blocked when the plugin can't write project data at all, or (for local→synced only)
    // when synced storage is out of room.
    const moveBlocked = !isAllowedToSync || (moveTarget === "synced" && !canMoveToSynced)
    const moveDisabledReason = !isAllowedToSync
        ? "You don't have permission to change this project's synced presets."
        : "Not enough room in Framer's synced storage — move another preset to this device to free up space."

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
        if (moveBlocked) return
        const result = await movePreset(preset, moveTarget)
        if (result.ok) {
            onMoved(result.value)
        } else {
            // Belt-and-suspenders: the menu item is already disabled without permission,
            // but if a move still comes back denied (e.g. permission changed mid-session),
            // tell the user rather than silently doing nothing.
            notify(result.message, "error")
        }
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
            disabled: moveBlocked,
            disabledReason: moveDisabledReason,
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
