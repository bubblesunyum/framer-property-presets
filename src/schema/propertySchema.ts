import {
  type CanvasNode,
  hasGridLayout,
  hasStackLayout,
  supportsBorderRadius,
  supportsLayout,
  supportsOpacity,
  supportsOverflow,
  supportsPins,
  supportsPosition,
  supportsSize,
  supportsSizeConstraints,
  supportsVisible,
  supportsZIndex,
} from 'framer-plugin'
import type {PresetProperties, PresetPropertyKey, PropertyGroup} from '../types/preset'

export type IconSet = 'direction' | 'alignment' | 'distribution' | 'flow' | 'position' | 'overflow' | 'pointer-events'

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
  /** Render the control spanning the full row with no label column — for controls
   *  whose meaning is self-evident from their icons (Flow, Position, Alignment). */
  fullWidth?: boolean
  /** Only meaningful alongside `fullWidth` — shows a small heading above the control
   *  instead of leaving it bare (Flow, Alignment). Position stays bare: `fullWidth`
   *  without this, since its icons alone are self-evident. */
  labelAbove?: boolean
  /** This field has no real backing attribute in the framer-plugin SDK (Squircle,
   *  Pointer Events — neither exists in the installed SDK version) — it's captured/
   *  edited/stored like any other property, but `applyPreset.ts`/`applyAttributesToSelection`
   *  skip it when building a `setAttributes` payload, since sending an unrecognized key
   *  to the real SDK is unverified territory. Revisit if a future SDK version adds one. */
  synthetic?: boolean
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
  /** Min/Max constraints only ever serialize to px or % (the SDK's WidthConstraint/
   *  HeightConstraint types have no fit-content/fr variant) — restricts the mode
   *  picker to those two instead of the full Width/Height set. */
  constrained?: boolean
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

/** Boolean rendered as a two-way "Yes"/"No" segmented control instead of a checkbox. */
export interface YesNoDescriptor extends BaseDescriptor {
  control: 'yes-no'
}

/** Plain boolean rendered as a sliding on/off pill (ToggleSwitch) — e.g. Wrap. */
export interface ToggleDescriptor extends BaseDescriptor {
  control: 'toggle'
}

/** Combined distribute + align control: a single 3×3 grid that writes both
 *  `stackDistribution` (main axis) and `stackAlignment` (cross axis) at once — see
 *  AlignmentGrid and the `stackAlignment` composite in buildFieldProps. */
export interface AlignGridDescriptor extends BaseDescriptor {
  control: 'align-grid'
}

/** Nullable numeric field with a small +/- pair beside it — for Z-Index, where nudging
 *  by one is the common interaction. */
export interface StepperDescriptor extends BaseDescriptor {
  control: 'stepper'
  min?: number
  max?: number
  nullable: boolean
}

/** The SDK's `opacity` is a plain 0–1 number; shown/edited as a 0–100 percentage. */
export interface OpacityDescriptor extends BaseDescriptor {
  control: 'opacity'
}

/** A plain 0–100 value stored/shown as-is (no 0–1 conversion) — for synthetic,
 *  preset-only percentages like Squircle that have no real SDK-side representation. */
export interface PercentDescriptor extends BaseDescriptor {
  control: 'percent'
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
  | YesNoDescriptor
  | ToggleDescriptor
  | AlignGridDescriptor
  | StepperDescriptor
  | OpacityDescriptor
  | PercentDescriptor
  | SelectDescriptor
  | SegmentedDescriptor

const isStack = (properties: PresetProperties) => properties.layout === 'stack'
const isGrid = (properties: PresetProperties) => properties.layout === 'grid'
// "None" is stored as `null`, not the string "none" — see the segmented-control's
// null<->"none" mapping in PropertyRow.tsx#renderControl.
const hasLayout = (properties: PresetProperties) => properties.layout != null

// Widened on purpose: users have reported nodes where Framer's own panel lets them set
// Z-Index but `supportsZIndex` alone came back false, hiding the whole Layout section
// ("this layer doesn't support layout properties"). Any node capable of Flow is, per the
// SDK's own EditableFrameNodeAttributes shape, also always capable of Z-Index — so treat
// either guard passing as enough to show it. `applyPreset.ts` still re-checks the real
// `supportsZIndex` before ever writing, so this can't cause a bad write, only a
// too-eagerly-shown field on some exotic node type.
const supportsZIndexOrLayout = (node: CanvasNode) => supportsZIndex(node) || supportsLayout(node)

// Neither Squircle nor Pointer Events exist in the installed framer-plugin SDK version
// (verified against its .d.ts — no `squircle`/`cornerSmoothing`/`pointerEvents` trait of
// any kind). Both are preset-only UI values for now: always "supported" since there's no
// real node capability to check, never written to a real node (see `synthetic` above).
const alwaysSupported = () => true

export const PROPERTY_SCHEMA: PropertyDescriptor[] = [
  // ---- Position ----
  {
    key: 'position',
    group: 'position',
    label: 'Position',
    control: 'segmented',
    iconSet: 'position',
    fullWidth: true,
    labelAbove: true,
    guard: supportsPosition,
    options: [
      {value: 'relative', label: 'Relative'},
      {value: 'absolute', label: 'Absolute'},
      {value: 'fixed', label: 'Fixed'},
      {value: 'sticky', label: 'Sticky'},
    ],
  },
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

  // ---- Size ----
  {key: 'width', group: 'size', label: 'Width', control: 'size-length', guard: supportsSize},
  {key: 'height', group: 'size', label: 'Height', control: 'size-length', guard: supportsSize},
  {
    key: 'minWidth',
    group: 'size',
    label: 'Min Width',
    control: 'size-length',
    constrained: true,
    guard: supportsSizeConstraints,
  },
  {
    key: 'maxWidth',
    group: 'size',
    label: 'Max Width',
    control: 'size-length',
    constrained: true,
    guard: supportsSizeConstraints,
  },
  {
    key: 'minHeight',
    group: 'size',
    label: 'Min Height',
    control: 'size-length',
    constrained: true,
    guard: supportsSizeConstraints,
  },
  {
    key: 'maxHeight',
    group: 'size',
    label: 'Max Height',
    control: 'size-length',
    constrained: true,
    guard: supportsSizeConstraints,
  },

  // ---- Layout (shared) ----
  {
    key: 'layout',
    group: 'layout',
    label: 'Flow',
    control: 'segmented',
    iconSet: 'flow',
    fullWidth: true,
    labelAbove: true,
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
    // Combined distribute + align: the 3×3 grid writes both stackDistribution and
    // stackAlignment (see AlignmentGrid / buildFieldProps). stackDistribution stays in
    // the schema for capture/apply but no longer has its own editor row.
    key: 'stackAlignment',
    group: 'layout',
    label: 'Alignment',
    control: 'align-grid',
    fullWidth: true,
    labelAbove: true,
    guard: hasStackLayout,
    visibleWhen: isStack,
  },
  {
    key: 'stackWrapEnabled',
    group: 'layout',
    label: 'Wrap',
    control: 'toggle',
    guard: hasStackLayout,
    visibleWhen: isStack,
  },
  {
    key: 'zIndex',
    group: 'layout',
    label: 'Elevation',
    control: 'stepper',
    nullable: true,
    guard: supportsZIndexOrLayout,
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

  // ---- Appearance ---- (row order: Opacity, Radius, Overflow, Squircle)
  {
    key: 'opacity',
    group: 'appearance',
    label: 'Opacity',
    control: 'opacity',
    guard: supportsOpacity,
  },
  {
    key: 'borderRadius',
    group: 'appearance',
    label: 'Radius',
    control: 'dimension',
    unit: 'px',
    nullable: true,
    guard: supportsBorderRadius,
  },
  {
    key: 'overflow',
    group: 'appearance',
    label: 'Overflow',
    control: 'segmented',
    iconSet: 'overflow',
    guard: supportsOverflow,
    // Order was Visible/Hidden/Scroll/Clip — Clip and Hidden swapped per request.
    options: [
      {value: 'visible', label: 'Visible'},
      {value: 'clip', label: 'Clip'},
      {value: 'auto', label: 'Scroll'},
      {value: 'hidden', label: 'Hidden'},
    ],
  },
  {
    key: 'squircle',
    group: 'appearance',
    label: 'Squircle',
    control: 'percent',
    guard: alwaysSupported,
    synthetic: true,
  },
  {
    // Rendered specially, as an eye-icon toggle in the Appearance section's own header
    // (see AppearanceSection) rather than through the generic row list — it's excluded
    // from EDITOR_ROWS.appearance for that reason.
    key: 'visible',
    group: 'appearance',
    label: 'Visible',
    control: 'toggle',
    guard: supportsVisible,
  },

  // ---- Interaction ----
  {
    key: 'pointerEvents',
    group: 'interaction',
    label: 'Pointer Events',
    control: 'segmented',
    iconSet: 'pointer-events',
    guard: alwaysSupported,
    synthetic: true,
    options: [
      {value: 'auto', label: 'Auto'},
      {value: 'none', label: 'None'},
    ],
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
