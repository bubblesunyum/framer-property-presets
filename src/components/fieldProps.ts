import {descriptorFor} from '../schema/propertySchema'
import type {PresetProperties, PresetPropertyKey} from '../types/preset'
import type {AlignmentValue} from './AlignmentGrid'
import type {FieldProps} from './PropertyRow'

/** Derives the Flow control's displayed value from the two underlying keys it
 *  composites — Row/Column both mean `layout: "stack"`, differing only in
 *  `stackDirection`, which no longer has its own editor row. */
export function flowValueFor(properties: PresetProperties): string {
  if (properties.layout === 'grid') return 'grid'
  if (properties.layout === 'stack') return properties.stackDirection === 'horizontal' ? 'row' : 'column'
  return 'none'
}

// Switching Flow to Row/Column/Grid only sets `layout` (+`stackDirection`); if the
// node wasn't already that flow type its sibling keys were never captured, so they'd
// stay permanently invisible (visibility also requires the key to already exist — see
// buildFieldProps). These seed a starting value the first time each sub-group becomes
// relevant, without overwriting anything already present.
export const STACK_DEFAULTS: PresetProperties = {
  stackDistribution: 'start',
  stackAlignment: 'start',
  stackWrapEnabled: false,
}

export const GRID_DEFAULTS: PresetProperties = {
  gridColumnCount: '2',
  gridRowCount: null,
  gridAlignment: 'start',
  gridColumnWidthType: 'minmax',
  gridColumnWidth: 100,
  gridColumnMinWidth: 100,
  gridRowHeightType: 'auto',
  gridRowHeight: 100,
}

export function withDefaults(properties: PresetProperties, defaults: PresetProperties): PresetProperties {
  const next = {...properties}
  for (const key of Object.keys(defaults) as PresetPropertyKey[]) {
    if (!Object.prototype.hasOwnProperty.call(next, key)) next[key] = defaults[key]
  }
  return next
}

export interface FieldPropsConfig {
  properties: PresetProperties
  isIncluded: (key: PresetPropertyKey) => boolean
  /** Merge a set of key/value changes into the working properties, running whatever
   *  side effect the host needs alongside it — tracking touched keys in the preset
   *  editor, or writing to the live canvas node in the Design panel. */
  commit: (changes: PresetProperties) => void
  /** Edit mode only: toggle a key in/out of the saved preset. Omitted elsewhere. */
  onToggleIncluded?: (key: PresetPropertyKey) => void
}

/** Turns a property key into the props a PropertyRow needs, resolving the two composite
 *  controls (Flow over layout+stackDirection, the alignment grid over the two stack
 *  align keys) here so PropertyRow/renderControl stay generic 1:1. Returns null when the
 *  key doesn't apply to the current node/layout — the caller filters those out. */
export function buildFieldProps(key: PresetPropertyKey, config: FieldPropsConfig): FieldProps | null {
  const descriptor = descriptorFor(key)
  if (!descriptor) return null
  if (!Object.prototype.hasOwnProperty.call(config.properties, key)) return null
  if (descriptor.visibleWhen && !descriptor.visibleWhen(config.properties)) return null

  const included = config.isIncluded(key)
  const onToggleIncluded = config.onToggleIncluded ? () => config.onToggleIncluded!(key) : undefined

  // Flow folds direction into Row/Column, so one control drives two keys.
  if (key === 'layout') {
    return {
      descriptor,
      value: flowValueFor(config.properties),
      included,
      onChange: (next) => {
        if (next === null) {
          config.commit({layout: null})
          return
        }
        const defaults = next === 'grid' ? GRID_DEFAULTS : STACK_DEFAULTS
        const changes: PresetProperties = {
          layout: next === 'grid' ? 'grid' : 'stack',
          ...(next !== 'grid' && {stackDirection: next === 'row' ? 'horizontal' : 'vertical'}),
        }
        for (const defKey of Object.keys(defaults) as PresetPropertyKey[]) {
          if (!Object.prototype.hasOwnProperty.call(config.properties, defKey)) changes[defKey] = defaults[defKey]
        }
        config.commit(changes)
      },
      onToggleIncluded,
    }
  }

  // Distribute + Align share one 3×3 grid, writing both stack keys at once.
  if (key === 'stackAlignment') {
    const value: AlignmentValue = {
      direction: config.properties.stackDirection === 'horizontal' ? 'horizontal' : 'vertical',
      distribution: (config.properties.stackDistribution as string | null | undefined) ?? null,
      alignment: (config.properties.stackAlignment as string | null | undefined) ?? null,
    }
    return {
      descriptor,
      value,
      included,
      onChange: (next) => {
        const {distribution, alignment} = next as {distribution: string; alignment: string}
        config.commit({stackDistribution: distribution, stackAlignment: alignment})
      },
      onToggleIncluded,
    }
  }

  return {
    descriptor,
    value: config.properties[key],
    included,
    onChange: (value) => config.commit({[key]: value}),
    onToggleIncluded,
  }
}
