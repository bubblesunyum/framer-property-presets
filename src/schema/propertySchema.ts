import {
  type CanvasNode,
  hasGridLayout,
  hasStackLayout,
  supportsLayout,
  supportsOverflow,
  supportsPins,
  supportsPosition,
  supportsSize,
  supportsSizeConstraints,
} from 'framer-plugin'
import type {PresetProperties, PresetPropertyKey, PropertyGroup} from '../types/preset'

export type IconSet = 'direction' | 'alignment' | 'distribution' | 'flow'

interface BaseDescriptor {
  key: PresetPropertyKey
  group: PropertyGroup
  label: string
  /** Real SDK runtime type guard — decides whether this field is meaningful for a
   *  given node at all (independent of the node's current layout value). */
  guard: (node: CanvasNode) => boolean
  /** Further narrows visibility using already-captured/edited sibling values, e.g.
   *  stack-only fields only when `layout === "stack"`. Checked in addition to `guard`. */
  visibleWhen?: (properties: PresetProperties) => boolean
}

export interface DimensionDescriptor extends BaseDescriptor {
  control: 'dimension'
  unit: 'px' | '%'
  /** Overrides the unit as the text shown inside the field (e.g. "T" for Top) —
   *  the value is still serialized with `unit` regardless of what's displayed. */
  displaySuffix?: string
  nullable: boolean
}

export interface LengthDescriptor extends BaseDescriptor {
  control: 'length'
  placeholder?: string
}

/** CSS-shorthand-style padding: a single value (all sides equal) or a 4-value
 *  "top right bottom left" string — the SDK type has no 2-value form, so a
 *  vertical/horizontal split is a UI-only convenience over the 4-value string. */
export interface PaddingDescriptor extends BaseDescriptor {
  control: 'padding'
}

/** Width/height-style fields: a numeric value plus a sizing mode (fixed px, relative
 *  %, hug contents, or fill/fraction) — mirrors Framer's own Size panel fields. */
export interface SizeLengthDescriptor extends BaseDescriptor {
  control: 'size-length'
}

export interface NumberDescriptor extends BaseDescriptor {
  control: 'number'
  min?: number
  step?: number
  nullable: boolean
}

export interface BooleanDescriptor extends BaseDescriptor {
  control: 'boolean'
}

/** Checkbox over the SDK's 4-state `overflow` enum ("visible" | "hidden" | "auto" |
 *  "clip") rather than a true boolean — checked means "hidden" (clips), unchecked
 *  means "visible" (doesn't). Matches how Framer's own "Clip content" checkbox works;
 *  "auto"/"clip" aren't offered as a separate UI state here. */
export interface ClipToggleDescriptor extends BaseDescriptor {
  control: 'clip-toggle'
}

/** Boolean rendered as a two-way "Yes"/"No" segmented control instead of a checkbox. */
export interface YesNoDescriptor extends BaseDescriptor {
  control: 'yes-no'
}

export interface SelectOption {
  value: string
  label: string
  /** Shown instead of `label` in a closed dropdown's trigger, so a long label (e.g.
   *  "Relative") doesn't get CSS-ellipsis-truncated in the compact collapsed state —
   *  the open option list always shows the full `label`. Falls back to `label`. */
  shortLabel?: string
}

export interface SelectDescriptor extends BaseDescriptor {
  control: 'select'
  options: SelectOption[]
  nullable: boolean
}

export interface SegmentedDescriptor extends BaseDescriptor {
  control: 'segmented'
  /** Omit for a text-label segmented control (e.g. Stack/Grid) rather than icons. */
  iconSet?: IconSet
  options: SelectOption[]
}

export type PropertyDescriptor =
  | DimensionDescriptor
  | LengthDescriptor
  | PaddingDescriptor
  | SizeLengthDescriptor
  | NumberDescriptor
  | BooleanDescriptor
  | ClipToggleDescriptor
  | YesNoDescriptor
  | SelectDescriptor
  | SegmentedDescriptor

const isStack = (properties: PresetProperties) => properties.layout === 'stack'
const isGrid = (properties: PresetProperties) => properties.layout === 'grid'
// "None" is stored as `null`, not the string "none" — see the segmented-control's
// null<->"none" mapping in PropertyRow.tsx#renderControl.
const hasLayout = (properties: PresetProperties) => properties.layout != null

export const PROPERTY_SCHEMA: PropertyDescriptor[] = [
  // ---- Position ----
  {
    key: 'top',
    group: 'position',
    label: 'Top',
    control: 'dimension',
    unit: 'px',
    displaySuffix: 'T',
    nullable: true,
    guard: supportsPins,
  },
  {
    key: 'right',
    group: 'position',
    label: 'Right',
    control: 'dimension',
    unit: 'px',
    displaySuffix: 'R',
    nullable: true,
    guard: supportsPins,
  },
  {
    key: 'bottom',
    group: 'position',
    label: 'Bottom',
    control: 'dimension',
    unit: 'px',
    displaySuffix: 'B',
    nullable: true,
    guard: supportsPins,
  },
  {
    key: 'left',
    group: 'position',
    label: 'Left',
    control: 'dimension',
    unit: 'px',
    displaySuffix: 'L',
    nullable: true,
    guard: supportsPins,
  },
  {
    key: 'position',
    group: 'position',
    label: 'Type',
    control: 'select',
    nullable: false,
    guard: supportsPosition,
    options: [
      {value: 'relative', label: 'Relative', shortLabel: 'Rel'},
      {value: 'absolute', label: 'Absolute'},
      {value: 'fixed', label: 'Fixed'},
      {value: 'sticky', label: 'Sticky'},
    ],
  },

  // ---- Size ----
  {key: 'width', group: 'size', label: 'Width', control: 'size-length', guard: supportsSize},
  {key: 'height', group: 'size', label: 'Height', control: 'size-length', guard: supportsSize},
  {key: 'minWidth', group: 'size', label: 'Min Width', control: 'size-length', guard: supportsSizeConstraints},
  {key: 'maxWidth', group: 'size', label: 'Max Width', control: 'size-length', guard: supportsSizeConstraints},
  {key: 'minHeight', group: 'size', label: 'Min Height', control: 'size-length', guard: supportsSizeConstraints},
  {key: 'maxHeight', group: 'size', label: 'Max Height', control: 'size-length', guard: supportsSizeConstraints},

  // ---- Layout (shared) ----
  {
    key: 'layout',
    group: 'layout',
    label: 'Flow',
    control: 'segmented',
    iconSet: 'flow',
    guard: supportsLayout,
    // The underlying `layout`/`stackDirection` mapping (row = stack+horizontal,
    // column = stack+vertical) is handled specially in PresetEditor's fieldProps —
    // this options list only drives which 4 buttons render.
    options: [
      {value: 'none', label: 'None'},
      {value: 'row', label: 'Row'},
      {value: 'column', label: 'Column'},
      {value: 'grid', label: 'Grid'},
    ],
  },
  {
    key: 'gap',
    group: 'layout',
    label: 'Gap',
    control: 'dimension',
    unit: 'px',
    nullable: true,
    guard: supportsLayout,
    visibleWhen: hasLayout,
  },
  {
    key: 'padding',
    group: 'layout',
    label: 'Padding',
    control: 'padding',
    guard: supportsLayout,
    visibleWhen: hasLayout,
  },
  {
    key: 'overflow',
    group: 'layout',
    label: 'Clip Content',
    control: 'clip-toggle',
    guard: supportsOverflow,
  },

  // ---- Layout (stack-specific) ----
  {
    key: 'stackDirection',
    group: 'layout',
    label: 'Direction',
    control: 'segmented',
    iconSet: 'direction',
    guard: hasStackLayout,
    visibleWhen: isStack,
    options: [
      {value: 'horizontal', label: 'Horizontal'},
      {value: 'vertical', label: 'Vertical'},
    ],
  },
  {
    key: 'stackDistribution',
    group: 'layout',
    label: 'Distribute',
    control: 'select',
    nullable: true,
    guard: hasStackLayout,
    visibleWhen: isStack,
    options: [
      {value: 'start', label: 'Start'},
      {value: 'center', label: 'Center'},
      {value: 'end', label: 'End'},
      {value: 'space-between', label: 'Space Between', shortLabel: 'Between'},
      {value: 'space-around', label: 'Space Around', shortLabel: 'Around'},
      {value: 'space-evenly', label: 'Space Evenly', shortLabel: 'Evenly'},
    ],
  },
  {
    key: 'stackAlignment',
    group: 'layout',
    label: 'Align',
    control: 'segmented',
    iconSet: 'alignment',
    guard: hasStackLayout,
    visibleWhen: isStack,
    options: [
      {value: 'start', label: 'Start'},
      {value: 'center', label: 'Center'},
      {value: 'end', label: 'End'},
    ],
  },
  {
    key: 'stackWrapEnabled',
    group: 'layout',
    label: 'Wrap',
    control: 'yes-no',
    guard: hasStackLayout,
    visibleWhen: isStack,
  },

  // ---- Layout (grid-specific) ----
  {
    key: 'gridColumnCount',
    group: 'layout',
    label: 'Columns',
    control: 'length',
    guard: hasGridLayout,
    visibleWhen: isGrid,
  },
  {
    key: 'gridRowCount',
    group: 'layout',
    label: 'Rows',
    control: 'number',
    nullable: true,
    guard: hasGridLayout,
    visibleWhen: isGrid,
  },
  {
    key: 'gridAlignment',
    group: 'layout',
    label: 'Align',
    control: 'segmented',
    iconSet: 'alignment',
    guard: hasGridLayout,
    visibleWhen: isGrid,
    options: [
      {value: 'start', label: 'Start'},
      {value: 'center', label: 'Center'},
      {value: 'end', label: 'End'},
    ],
  },
  {
    key: 'gridColumnWidthType',
    group: 'layout',
    label: 'Column Width',
    control: 'select',
    nullable: true,
    guard: hasGridLayout,
    visibleWhen: isGrid,
    options: [
      {value: 'fixed', label: 'Fixed'},
      {value: 'minmax', label: 'Flexible', shortLabel: 'Flex'},
    ],
  },
  {
    key: 'gridColumnWidth',
    group: 'layout',
    label: 'Width',
    control: 'number',
    nullable: true,
    guard: hasGridLayout,
    visibleWhen: (p) => isGrid(p) && p.gridColumnWidthType === 'fixed',
  },
  {
    key: 'gridColumnMinWidth',
    group: 'layout',
    label: 'Min Width',
    control: 'number',
    nullable: true,
    guard: hasGridLayout,
    visibleWhen: (p) => isGrid(p) && p.gridColumnWidthType === 'minmax',
  },
  {
    key: 'gridRowHeightType',
    group: 'layout',
    label: 'Row Height',
    control: 'select',
    nullable: true,
    guard: hasGridLayout,
    visibleWhen: isGrid,
    options: [
      {value: 'fixed', label: 'Fixed'},
      {value: 'auto', label: 'Auto'},
      {value: 'fit', label: 'Fit'},
    ],
  },
  {
    key: 'gridRowHeight',
    group: 'layout',
    label: 'Height',
    control: 'number',
    nullable: true,
    guard: hasGridLayout,
    visibleWhen: (p) => isGrid(p) && p.gridRowHeightType === 'fixed',
  },
]

export function descriptorFor(key: PresetPropertyKey): PropertyDescriptor | undefined {
  return PROPERTY_SCHEMA.find((descriptor) => descriptor.key === key)
}

export function descriptorsForGroup(group: PropertyGroup): PropertyDescriptor[] {
  return PROPERTY_SCHEMA.filter((descriptor) => descriptor.group === group)
}

/** Most fields are `| null` in the real SDK precisely to distinguish "explicitly set"
 *  from "unset/default" — a non-null value here means the node (or whoever last
 *  touched it in Framer itself) already made a deliberate choice, so we surface it
 *  as included from the start. `position` is the one field typed as a plain
 *  non-nullable value in the SDK, so it falls back to a hardcoded default comparison
 *  instead (the "relative" flow-position mode). */
export function isExplicitValue(key: PresetPropertyKey, value: unknown): boolean {
  if (key === 'position') return value !== 'relative'
  return value !== null && value !== undefined
}
