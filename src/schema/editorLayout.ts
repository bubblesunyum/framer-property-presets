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
    // Position & Size are rendered explicitly by PropertySections (the position
    // segmented control + conditional pin cross, then the Width/Height axes with their
    // own Min/Max expanders) — not through this generic row list.
    position: [],
    size: [],
    layout: [
        // Clip Content sits first so it never moves as Flow-specific rows appear/
        // disappear below it. Direction is folded into the Flow control (Row/Column);
        // Distribute + Align are folded into one alignment grid ("stackAlignment").
        "overflow",
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
    ],
}
