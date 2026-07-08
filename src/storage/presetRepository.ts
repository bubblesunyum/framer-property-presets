import { DEFAULT_PRESET_APPEARANCE, withPresetAppearanceDefaults, type Preset, type PresetLocation, type PresetProperties } from "../types/preset"
import { localStore } from "./localStore"
import { syncedStore } from "./syncedStore"
import type { StorageResult } from "./types"

export interface CreateResult {
    preset: Preset
    fellBackToLocal: boolean
}

/** Local storage is the durable source of truth — every preset always lives there. The
 *  synced store is a best-effort cloud *mirror* of the subset that fits and the user
 *  hasn't removed; a preset's `location` is derived from whether its id is present in
 *  the synced store ("synced" = in the cloud, "local" = local-only). */
export async function loadAllPresets(): Promise<Preset[]> {
    const [synced, local] = await Promise.all([syncedStore.loadAll(), localStore.loadAll()])
    const syncedIds = new Set(synced.map((preset) => preset.id))
    const byId = new Map<string, Preset>()
    // Seed with every record from either store (older presets may exist in only one),
    // then stamp the location purely from synced-store presence.
    for (const preset of [...local, ...synced]) {
        byId.set(preset.id, { ...preset, location: syncedIds.has(preset.id) ? "synced" : "local" })
    }
    return [...byId.values()].sort((a, b) => a.createdAt - b.createdAt).map(withPresetAppearanceDefaults)
}

/** Always writes to local storage, and additionally to the cloud when the shared budget
 *  can fit it — so a new preset is backed up locally *and* synced by default, only
 *  local-only when the cloud is full. */
export async function createPreset(
    name: string,
    properties: PresetProperties,
    appearance: {icon: string; color: string} = DEFAULT_PRESET_APPEARANCE
): Promise<StorageResult<CreateResult>> {
    const now = Date.now()
    const base = { id: crypto.randomUUID(), name, createdAt: now, updatedAt: now, properties, ...appearance }

    // Durable local copy first — the save must never fail just because the cloud is full.
    const localResult = await localStore.write({ ...base, location: "local" })
    if (!localResult.ok) return localResult

    // Then mirror to the cloud if there's room.
    let synced = false
    const syncedCandidate: Preset = { ...base, location: "synced" }
    if (await syncedStore.canFit(syncedCandidate)) {
        const result = await syncedStore.write(syncedCandidate)
        synced = result.ok
    }

    const preset: Preset = { ...base, location: synced ? "synced" : "local" }
    return { ok: true, value: { preset, fellBackToLocal: !synced } }
}

/** Same budget check the cloud write uses, exposed so the UI can gray out the "move to
 *  synced" control ahead of a click rather than attempting and failing. */
export async function canFitInSynced(preset: Preset): Promise<boolean> {
    return syncedStore.canFit({ ...preset, location: "synced" })
}

/** Adds or removes a preset's *cloud* mirror (the local copy always stays). "synced"
 *  writes it to the cloud (budget-checked); "local" removes it from the cloud. */
export async function movePreset(preset: Preset, to: PresetLocation): Promise<StorageResult<Preset>> {
    const updated: Preset = { ...preset, location: to, updatedAt: Date.now() }

    if (to === "synced") {
        const result = await syncedStore.write(updated)
        if (!result.ok) return result
    } else {
        await syncedStore.remove(preset.id)
    }
    // Keep the local copy current either way.
    await localStore.write({ ...updated, location: "local" })
    return { ok: true, value: updated }
}

/** Removes a preset from both stores. */
export async function deletePreset(preset: Preset): Promise<void> {
    await Promise.all([syncedStore.remove(preset.id), localStore.remove(preset.id)])
}

/** Overwrites an existing preset's name/properties in place. Always updates the local
 *  copy; also updates the cloud copy when the preset is synced — falling back to
 *  local-only if the edit no longer fits the cloud budget. */
export async function updatePreset(
    preset: Preset,
    name: string,
    properties: PresetProperties,
    appearance: {icon: string; color: string} = {icon: preset.icon, color: preset.color}
): Promise<StorageResult<Preset>> {
    const now = Date.now()
    const base = { ...preset, name, properties, ...appearance, updatedAt: now }

    const localResult = await localStore.write({ ...base, location: "local" })
    if (!localResult.ok) return localResult

    let synced = false
    if (preset.location === "synced") {
        const syncedCandidate: Preset = { ...base, location: "synced" }
        if (await syncedStore.canFit(syncedCandidate)) {
            const result = await syncedStore.write(syncedCandidate)
            synced = result.ok
        }
        // No longer fits the cloud — drop the stale cloud copy so it goes local-only.
        if (!synced) await syncedStore.remove(preset.id)
    }

    return { ok: true, value: { ...base, location: synced ? "synced" : "local" } }
}
