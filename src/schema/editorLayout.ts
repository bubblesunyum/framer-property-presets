import type { PresetPropertyKey, PropertyGroup } from "../types/preset"

/** Presentation-only grouping for the New Preset editor: which fields sit side by
 *  side (or stacked in a column) versus stand alone, mirroring how Framer's own
 *  Resizing panel pairs Width/Height side by side with their Min/Max constraints
 *  stacked underneath each one. Kept separate from the property schema itself since
 *  the schema also drives capture and apply, which don't care about visual layout. */
export type EditorRow =
    | PresetPropertyKey
    | readonly [PresetPropertyKey, PresetPropertyKey]
    | { readonly columns: readonly [readonly PresetPropertyKey[], readonly PresetPropertyKey[]] }

export const EDITOR_ROWS: Record<PropertyGroup, EditorRow[]> = {
    // top/right/bottom/left are rendered separately as the pin-cross layout, not
    // through this generic row list — see PresetEditor's position-cross block.
    position: ["position"],
    size: [{ columns: [["width", "minWidth", "maxWidth"], ["height", "minHeight", "maxHeight"]] }],
    layout: [
        "layout",
        ["stackDirection", "stackWrapEnabled"],
        ["stackDistribution", "stackAlignment"],
        ["gap", "padding"],
        ["gridColumnCount", "gridRowCount"],
        "gridAlignment",
        "gridColumnWidthType",
        "gridColumnWidth",
        "gridColumnMinWidth",
        "gridRowHeightType",
        "gridRowHeight",
        // Not layout-type-specific (visible regardless of Flow) — placed last to match
        // where Framer's own panel shows it, right after Padding.
        "overflow",
    ],
}
