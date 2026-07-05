import type { Preset } from "../types/preset"
import type { PresetStore, StorageResult } from "./types"

const PRESET_PREFIX = "local-preset:"
const INDEX_KEY = "local-preset-index"

const keyFor = (id: string) => `${PRESET_PREFIX}${id}`

function readIndex(): string[] {
    const raw = localStorage.getItem(INDEX_KEY)
    if (!raw) return []
    try {
        const parsed: unknown = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []
    } catch {
        return []
    }
}

function writeIndex(ids: string[]): void {
    localStorage.setItem(INDEX_KEY, JSON.stringify(ids))
}

function serialize(preset: Preset): string {
    const { location: _location, ...rest } = preset
    return JSON.stringify(rest)
}

function deserialize(id: string, raw: string): Preset | null {
    try {
        const parsed = JSON.parse(raw) as Omit<Preset, "location" | "id">
        return { ...parsed, id, location: "local" }
    } catch {
        return null
    }
}

async function loadAll(): Promise<Preset[]> {
    const ids = readIndex()
    const presets: Preset[] = []
    let indexNeedsRepair = false

    for (const id of ids) {
        const raw = localStorage.getItem(keyFor(id))
        if (raw === null) {
            indexNeedsRepair = true
            continue
        }
        const preset = deserialize(id, raw)
        if (preset) presets.push(preset)
        else indexNeedsRepair = true
    }

    if (indexNeedsRepair) writeIndex(presets.map((preset) => preset.id))
    return presets
}

async function write(preset: Preset): Promise<StorageResult<void>> {
    try {
        localStorage.setItem(keyFor(preset.id), serialize(preset))
        const ids = readIndex()
        if (!ids.includes(preset.id)) writeIndex([...ids, preset.id])
        return { ok: true, value: undefined }
    } catch (error) {
        return {
            ok: false,
            reason: "unknown",
            message: error instanceof Error ? error.message : "Failed to save preset to this device.",
        }
    }
}

async function remove(id: string): Promise<void> {
    localStorage.removeItem(keyFor(id))
    const ids = readIndex()
    const next = ids.filter((existingId) => existingId !== id)
    if (next.length !== ids.length) writeIndex(next)
}

async function canFit(): Promise<boolean> {
    return true
}

export const localStore: PresetStore = { loadAll, write, remove, canFit }
