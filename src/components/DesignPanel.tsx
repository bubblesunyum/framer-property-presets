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

  // Re-seed from the layer whenever the primary selection changes — keyed on id so a
  // bare re-emit of the same selection doesn't clobber an in-progress edit.
  useEffect(() => {
    setProperties(primary ? captureFromNode(primary).properties : {})
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

  const fieldProps = (key: PresetPropertyKey) => buildFieldProps(key, {properties, isIncluded: () => true, commit})

  return (
    <div className='property-scroll framer-hide-scrollbar'>
      <PropertySections fieldProps={fieldProps} />
    </div>
  )
}
