export type PropertyGroup = "position" | "size" | "layout"

export type PresetLocation = "synced" | "local"

export type PresetPropertyKey =
    // Position (pins)
    | "top"
    | "right"
    | "bottom"
    | "left"
    | "position"
    // Size
    | "width"
    | "height"
    | "minWidth"
    | "maxWidth"
    | "minHeight"
    | "maxHeight"
    // Layout (shared)
    | "layout"
    | "gap"
    | "padding"
    | "overflow"
    // Layout (stack)
    | "stackDirection"
    | "stackDistribution"
    | "stackAlignment"
    | "stackWrapEnabled"
    // Layout (grid)
    | "gridColumnCount"
    | "gridRowCount"
    | "gridAlignment"
    | "gridColumnWidthType"
    | "gridColumnWidth"
    | "gridColumnMinWidth"
    | "gridRowHeightType"
    | "gridRowHeight"

/** Sparse map: only keys the user chose to include are present. Heterogeneous value
 *  type here because it spans strings, numbers, and booleans depending on the key;
 *  the property schema narrows per-key at read/write time. */
export type PresetProperties = Partial<Record<PresetPropertyKey, unknown>>

export interface Preset {
    id: string
    name: string
    createdAt: number
    updatedAt: number
    properties: PresetProperties
    location: PresetLocation
}

/** Working state for the New Preset screen. There's no explicit include/exclude
 *  toggle — inclusion is inferred (see `schema/propertySchema.ts#isExplicitValue`)
 *  from whether a captured value looks explicitly set, plus whatever the user has
 *  touched in this editing session (tracked separately as UI state, not here). */
export interface DraftPreset {
    name: string
    properties: PresetProperties
}

export function createDraftFromProperties(properties: PresetProperties): DraftPreset {
    return { name: "", properties }
}

/** The only place that computes what actually gets persisted: `properties` filtered
 *  down to whichever keys the caller has determined are included. */
export function finalizePreset(properties: PresetProperties, includedKeys: ReadonlySet<PresetPropertyKey>): PresetProperties {
    const result: PresetProperties = {}
    for (const key of Object.keys(properties) as PresetPropertyKey[]) {
        if (includedKeys.has(key)) result[key] = properties[key]
    }
    return result
}
