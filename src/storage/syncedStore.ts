import { framer } from "framer-plugin"
import type { Preset } from "../types/preset"
import { byteLength } from "./byteSize"
import type { PresetStore, StorageResult } from "./types"

const PRESET_PREFIX = "preset:"
const INDEX_KEY = "preset-index"

/** Hard limits enforced by Framer's project-level plugin data store. */
export const MAX_ENTRY_BYTES = 2048
export const MAX_TOTAL_BYTES = 4096

const keyFor = (id: string) => `${PRESET_PREFIX}${id}`

async function readIndex(): Promise<string[]> {
    const raw = await framer.getPluginData(INDEX_KEY)
    if (!raw) return []
    try {
        const parsed: unknown = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []
    } catch {
        return []
    }
}

async function writeIndex(ids: string[]): Promise<void> {
    await framer.setPluginData(INDEX_KEY, JSON.stringify(ids))
}

/** Total bytes currently used across every key at the project level, optionally
 *  excluding one preset's own entry (used when checking whether an update to that
 *  same preset still fits). */
async function totalBytes(excludingId?: string): Promise<number> {
    const keys = await framer.getPluginDataKeys()
    let total = 0
    for (const key of keys) {
        if (excludingId && key === keyFor(excludingId)) continue
        const value = await framer.getPluginData(key)
        if (value === null) continue
        total += byteLength(key) + byteLength(value)
    }
    return total
}

function serialize(preset: Preset): string {
    // `location` is implied by which store an entry lives in — omit it to save bytes.
    const { location: _location, ...rest } = preset
    return JSON.stringify(rest)
}

function deserialize(id: string, raw: string): Preset | null {
    try {
        const parsed = JSON.parse(raw) as Omit<Preset, "location" | "id">
        return { ...parsed, id, location: "synced" }
    } catch {
        return null
    }
}

async function loadAll(): Promise<Preset[]> {
    const ids = await readIndex()
    const presets: Preset[] = []
    let indexNeedsRepair = false

    for (const id of ids) {
        const raw = await framer.getPluginData(keyFor(id))
        if (raw === null) {
            indexNeedsRepair = true
            continue
        }
        const preset = deserialize(id, raw)
        if (preset) presets.push(preset)
        else indexNeedsRepair = true
    }

    if (indexNeedsRepair) await writeIndex(presets.map((preset) => preset.id))
    return presets
}

async function canFit(preset: Preset): Promise<boolean> {
    const serialized = serialize(preset)
    const entryBytes = byteLength(keyFor(preset.id)) + byteLength(serialized)
    if (entryBytes > MAX_ENTRY_BYTES) return false
    const existingTotal = await totalBytes(preset.id)
    return existingTotal + entryBytes <= MAX_TOTAL_BYTES
}

async function write(preset: Preset): Promise<StorageResult<void>> {
    // `setPluginData` is a protected method — if the current user isn't allowed to use
    // it (e.g. a non-Editor role), invoking it anyway sends a message the host never
    // answers, so the returned promise just hangs forever instead of rejecting. Bail
    // out before that invoke happens so callers get an immediate result instead: for
    // `createPreset` this trips the same "doesn't fit, fall back to local" path
    // already used for the budget check below; for `updatePreset` it surfaces as a
    // normal save error instead of a Save button that silently does nothing.
    if (!framer.isAllowedTo("setPluginData")) {
        return {
            ok: false,
            reason: "permission-denied",
            message: "You don't have permission to write to Framer's synced storage.",
        }
    }

    const serialized = serialize(preset)
    const entryBytes = byteLength(keyFor(preset.id)) + byteLength(serialized)

    if (entryBytes > MAX_ENTRY_BYTES) {
        return {
            ok: false,
            reason: "entry-too-large",
            message: `This preset is too large to save (${entryBytes} of ${MAX_ENTRY_BYTES} bytes). Try excluding a few properties.`,
        }
    }

    const existingTotal = await totalBytes(preset.id)
    if (existingTotal + entryBytes > MAX_TOTAL_BYTES) {
        return {
            ok: false,
            reason: "aggregate-budget-exceeded",
            message: "Not enough room left in Framer's synced storage for this preset.",
        }
    }

    try {
        await framer.setPluginData(keyFor(preset.id), serialized)
        const ids = await readIndex()
        if (!ids.includes(preset.id)) await writeIndex([...ids, preset.id])
        return { ok: true, value: undefined }
    } catch (error) {
        return { ok: false, reason: "unknown", message: error instanceof Error ? error.message : "Failed to save preset." }
    }
}

async function remove(id: string): Promise<void> {
    await framer.setPluginData(keyFor(id), null)
    const ids = await readIndex()
    const next = ids.filter((existingId) => existingId !== id)
    if (next.length !== ids.length) await writeIndex(next)
}

export const syncedStore: PresetStore = { loadAll, write, remove, canFit }
