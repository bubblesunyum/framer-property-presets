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
    // through this generic row list — see PropertySections' PositionSection.
    position: ["position"],
    // Size is rendered explicitly by PropertySections' SizeSection (Width/Height above a
    // collapsible Min/Max accordion), not through this generic list.
    size: [],
    layout: [
        // Direction is folded into the Flow control itself (Row/Column) — not a
        // separate row here. Distribute + Align are folded into one alignment grid
        // (the single "stackAlignment" row below).
        "layout",
        "gap",
        "padding",
        "stackAlignment",
        "stackWrapEnabled",
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
