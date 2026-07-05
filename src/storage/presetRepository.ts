import type { Preset, PresetLocation, PresetProperties } from "../types/preset"
import { localStore } from "./localStore"
import { syncedStore } from "./syncedStore"
import type { PresetStore, StorageResult } from "./types"

const storeFor = (location: PresetLocation): PresetStore => (location === "synced" ? syncedStore : localStore)

export interface CreateResult {
    preset: Preset
    fellBackToLocal: boolean
}

export async function loadAllPresets(): Promise<Preset[]> {
    const [synced, local] = await Promise.all([syncedStore.loadAll(), localStore.loadAll()])
    return [...synced, ...local].sort((a, b) => a.createdAt - b.createdAt)
}

/** Tries synced storage first; if the shared budget can't fit this preset, falls back
 *  to local storage automatically instead of failing the save. */
export async function createPreset(name: string, properties: PresetProperties): Promise<StorageResult<CreateResult>> {
    const now = Date.now()
    const base = { id: crypto.randomUUID(), name, createdAt: now, updatedAt: now, properties }

    const syncedCandidate: Preset = { ...base, location: "synced" }
    if (await syncedStore.canFit(syncedCandidate)) {
        const result = await syncedStore.write(syncedCandidate)
        if (result.ok) return { ok: true, value: { preset: syncedCandidate, fellBackToLocal: false } }
    }

    const localCandidate: Preset = { ...base, location: "local" }
    const result = await localStore.write(localCandidate)
    if (result.ok) return { ok: true, value: { preset: localCandidate, fellBackToLocal: true } }
    return result
}

/** Same budget check `createPreset`/`write` use internally, exposed so the UI can gray
 *  out the "move to synced" control ahead of a click rather than attempting and failing. */
export async function canFitInSynced(preset: Preset): Promise<boolean> {
    return syncedStore.canFit({ ...preset, location: "synced" })
}

/** Writes to the target store first and only removes from the source after that
 *  succeeds, so a failed move never loses the preset. */
export async function movePreset(preset: Preset, to: PresetLocation): Promise<StorageResult<Preset>> {
    if (preset.location === to) return { ok: true, value: preset }

    const target: Preset = { ...preset, location: to, updatedAt: Date.now() }
    const result = await storeFor(to).write(target)
    if (!result.ok) return result

    await storeFor(preset.location).remove(preset.id)
    return { ok: true, value: target }
}

export async function deletePreset(preset: Preset): Promise<void> {
    await storeFor(preset.location).remove(preset.id)
}

/** Overwrites an existing preset's name/properties in place — stays in its current
 *  location (use `movePreset` to change that). Reuses the store's own `write`, so an
 *  edit to a synced preset is still budget-checked against the shared 4KB limit. */
export async function updatePreset(preset: Preset, name: string, properties: PresetProperties): Promise<StorageResult<Preset>> {
    const updated: Preset = { ...preset, name, properties, updatedAt: Date.now() }
    const result = await storeFor(preset.location).write(updated)
    if (!result.ok) return result
    return { ok: true, value: updated }
}
