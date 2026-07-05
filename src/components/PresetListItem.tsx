import { useIsAllowedTo, type CanvasNode } from "framer-plugin"
import { useEffect, useRef, useState } from "react"
import { applyPresetToSelection } from "../canvas/applyPreset"
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

function LocalIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="3.5" width="14" height="9" rx="1.4" stroke="currentColor" strokeWidth="1.3" />
            <path d="M6.5 15.5h5M9 12.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
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
        setStatus(outcome.appliedCount > 0 ? "applied" : "failed")
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
