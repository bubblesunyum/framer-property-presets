import type {CanvasNode} from 'framer-plugin'
import {useEffect, useState} from 'react'
import {applyAttributesToSelection} from '../canvas/applyPreset'
import {captureFromNode} from '../canvas/capturePreset'
import type {PresetProperties, PresetPropertyKey} from '../types/preset'
import './DesignPanel.css'
import {buildFieldProps} from './fieldProps'
import {PropertySections} from './PropertySections'

interface DesignPanelProps {
  selection: CanvasNode[]
}

interface RectLike {
  getRect?: () => Promise<{width: number; height: number} | null>
}

const EmptySize = {width: null, height: null} as const

/** Live edit mode: reflects the currently selected layer's properties and writes every
 *  change straight back to the canvas (to all selected layers that support the key).
 *  Reuses the same property form as the preset editor via PropertySections — there's no
 *  include/exclude here (every field is always active) and no Save; edits are live. */
export function DesignPanel({selection}: DesignPanelProps) {
  const primary = selection[0] ?? null
  const primaryId = (primary as {id?: string} | null)?.id ?? null

  const [properties, setProperties] = useState<PresetProperties>(() =>
    primary ? captureFromNode(primary).properties : {},
  )
  const [computedSize, setComputedSize] = useState<{width: number | null; height: number | null}>(EmptySize)

  // Re-seed from the layer whenever the primary selection changes — keyed on id so a
  // bare re-emit of the same selection doesn't clobber an in-progress edit. Also
  // re-fetches the node's actual rendered size (used to show Width/Height's value while
  // their mode is "Fit", which has no numeric value of its own).
  useEffect(() => {
    setProperties(primary ? captureFromNode(primary).properties : {})
    setComputedSize(EmptySize)
    let active = true
    void (primary as RectLike | null)?.getRect?.().then((rect) => {
      if (!active) return
      setComputedSize({width: rect?.width ?? null, height: rect?.height ?? null})
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryId])

  if (!primary) {
    return (
      <div className='design-panel-empty'>
        <p>Select a layer on the canvas to edit its properties live.</p>
      </div>
    )
  }

  const commit = (changes: PresetProperties) => {
    setProperties((prev) => ({...prev, ...changes}))
    void applyAttributesToSelection(changes, selection)
  }

  const fieldProps = (key: PresetPropertyKey) =>
    buildFieldProps(key, {properties, isIncluded: () => true, commit, computedSize})

  return (
    <div className='property-scroll framer-hide-scrollbar'>
      {/* Keyed by node id so per-node UI state (the min/max expanders, padding's
          expanded/collapsed side count) resets to its own defaults per selection,
          rather than carrying over from whatever was previously selected. */}
      <PropertySections key={primaryId ?? 'none'} fieldProps={fieldProps} />
    </div>
  )
}
