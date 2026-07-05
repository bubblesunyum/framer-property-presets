import type { Preset } from "../types/preset"

export type StorageResult<T> =
    | { ok: true; value: T }
    | { ok: false; reason: "entry-too-large" | "aggregate-budget-exceeded" | "permission-denied" | "unknown"; message: string }

export interface PresetStore {
    loadAll(): Promise<Preset[]>
    write(preset: Preset): Promise<StorageResult<void>>
    remove(id: string): Promise<void>
    canFit(preset: Preset): Promise<boolean>
}
