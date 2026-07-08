import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Preset } from "../types/preset"
import type { StorageResult } from "./types"

// Mock both underlying stores so we can assert *where* the repository writes without
// touching real localStorage / Framer plugin data.
const makeStore = () => ({
    loadAll: vi.fn<() => Promise<Preset[]>>(),
    write: vi.fn<(preset: Preset) => Promise<StorageResult<void>>>(),
    remove: vi.fn<(id: string) => Promise<void>>(),
    canFit: vi.fn<(preset: Preset) => Promise<boolean>>(),
})
const local = makeStore()
const synced = makeStore()

vi.mock("./localStore", () => ({ localStore: local }))
vi.mock("./syncedStore", () => ({ syncedStore: synced }))

const { createPreset, loadAllPresets, movePreset } = await import("./presetRepository")

const ok: StorageResult<void> = { ok: true, value: undefined }

beforeEach(() => {
    vi.clearAllMocks()
    local.write.mockResolvedValue(ok)
    synced.write.mockResolvedValue(ok)
    local.remove.mockResolvedValue(undefined)
    synced.remove.mockResolvedValue(undefined)
    local.loadAll.mockResolvedValue([])
    synced.loadAll.mockResolvedValue([])
})

describe("createPreset — always local, best-effort cloud", () => {
    it("writes to local *and* synced when the cloud has room", async () => {
        synced.canFit.mockResolvedValue(true)

        const result = await createPreset("p", {})

        expect(local.write).toHaveBeenCalledTimes(1)
        expect(local.write.mock.calls[0][0]).toMatchObject({ location: "local" })
        expect(synced.write).toHaveBeenCalledTimes(1)
        expect(synced.write.mock.calls[0][0]).toMatchObject({ location: "synced" })
        expect(result.ok && result.value.preset.location).toBe("synced")
        expect(result.ok && result.value.fellBackToLocal).toBe(false)
    })

    it("still writes local (and skips the cloud) when the cloud is full", async () => {
        synced.canFit.mockResolvedValue(false)

        const result = await createPreset("p", {})

        expect(local.write).toHaveBeenCalledTimes(1)
        expect(synced.write).not.toHaveBeenCalled()
        expect(result.ok && result.value.preset.location).toBe("local")
        expect(result.ok && result.value.fellBackToLocal).toBe(true)
    })

    it("does not attempt the cloud when the durable local write fails", async () => {
        local.write.mockResolvedValue({ ok: false, reason: "unknown", message: "boom" })
        synced.canFit.mockResolvedValue(true)

        const result = await createPreset("p", {})

        expect(result.ok).toBe(false)
        expect(synced.write).not.toHaveBeenCalled()
    })
})

describe("loadAllPresets — location derived from synced presence", () => {
    it("marks a preset synced when it lives in the cloud, local otherwise", async () => {
        const base = { name: "", createdAt: 1, updatedAt: 1, properties: {}, icon: "", color: "" }
        local.loadAll.mockResolvedValue([
            { ...base, id: "a", location: "local" },
            { ...base, id: "b", location: "local" },
        ])
        synced.loadAll.mockResolvedValue([{ ...base, id: "a", location: "synced" }])

        const presets = await loadAllPresets()
        const byId = Object.fromEntries(presets.map((p) => [p.id, p.location]))

        expect(byId).toEqual({ a: "synced", b: "local" })
    })
})

describe("movePreset — cloud mirror toggles, local copy always kept", () => {
    const preset: Preset = {
        id: "a",
        name: "",
        createdAt: 1,
        updatedAt: 1,
        properties: {},
        icon: "",
        color: "",
        location: "synced",
    }

    it("removing from the cloud keeps the local copy", async () => {
        await movePreset(preset, "local")
        expect(synced.remove).toHaveBeenCalledWith("a")
        expect(local.write).toHaveBeenCalledTimes(1)
        expect(local.write.mock.calls[0][0]).toMatchObject({ location: "local" })
    })
})
