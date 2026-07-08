import type {CanvasNode} from 'framer-plugin'
import {useCallback, useEffect, useMemo, useState} from 'react'
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
  getParent?: () => Promise<RectLike | null>
}

interface ComputedSize {
  width: number | null
  height: number | null
  parentWidth: number | null
  parentHeight: number | null
}

const EmptySize: ComputedSize = {width: null, height: null, parentWidth: null, parentHeight: null}

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
  const [computedSize, setComputedSize] = useState<ComputedSize>(EmptySize)

  // Re-seed from the layer whenever the primary selection changes — keyed on id so a
  // bare re-emit of the same selection doesn't clobber an in-progress edit. Also
  // re-fetches the node's actual rendered size (shown as Width/Height's value in "Fit"
  // mode) and its parent's size (used to convert px↔% when the user switches units).
  useEffect(() => {
    setProperties(primary ? captureFromNode(primary).properties : {})
    setComputedSize(EmptySize)
    let active = true
    const node = primary as RectLike | null
    void (async () => {
      try {
        const rect = node?.getRect ? await node.getRect() : null
        let parentRect: {width: number; height: number} | null = null
        if (node?.getParent) {
          const parent = await node.getParent()
          parentRect = parent?.getRect ? await parent.getRect() : null
        }
        if (!active) return
        setComputedSize({
          width: rect?.width ?? null,
          height: rect?.height ?? null,
          parentWidth: parentRect?.width ?? null,
          parentHeight: parentRect?.height ?? null,
        })
      } catch {
        if (active) setComputedSize(EmptySize)
      }
    })()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryId])

  // `framer-plugin` has no push-based "this node's attributes changed" subscription —
  // only `subscribeToSelection`, which fires on a *selection* change, not an edit made
  // within it. This is the best available substitute: poll the live node and pick up
  // whatever changed, so an edit made in Framer's own panel shows up here too, not just
  // edits made through this one. Skips the update if nothing actually changed, so a tick
  // where the node is untouched doesn't force a re-render. Each NumberField already
  // guards its own local buffer against being overwritten while it's focused (see
  // NumberField's `isFocusedRef`), so a poll landing mid-edit can't stomp on a keystroke.
  useEffect(() => {
    if (!primary) return
    const interval = window.setInterval(() => {
      const fresh = captureFromNode(primary).properties
      setProperties((prev) => (JSON.stringify(prev) === JSON.stringify(fresh) ? prev : fresh))
    }, 600)
    return () => window.clearInterval(interval)
  }, [primary, primaryId])

  // Stable identities are load-bearing, not just tidy: every field's onChange ultimately
  // closes over `commit`/`fieldProps`, and this panel re-renders every 600ms from the
  // live-sync poll above even when nothing changed (well, it shouldn't — but a fresh
  // function here on every render was cascading into every descendant's effects tearing
  // down and rebuilding their event listeners on the same cadence, which showed up as a
  // real bug: a drag-select gesture on LengthField's unit-mode picker could have its
  // window listeners torn down and rebuilt mid-gesture).
  const commit = useCallback(
    (changes: PresetProperties) => {
      setProperties((prev) => ({...prev, ...changes}))
      void applyAttributesToSelection(changes, selection)
    },
    [selection],
  )

  const fieldProps = useMemo(
    () => (key: PresetPropertyKey) =>
      buildFieldProps(key, {
        properties,
        isIncluded: () => true,
        commit,
        computedSize: {
          ...computedSize,
          // vh is measured against the canvas viewport height. There's no SDK for the
          // canvas viewport, so approximate with the parent's height (the nearest known
          // container) — good enough to keep a vh switch from wildly resizing the box.
          viewportHeight: computedSize.parentHeight,
        },
      }),
    [properties, commit, computedSize],
  )

  if (!primary) {
    return (
      <div className='design-panel-empty'>
        <p>Select a layer to edit its properties</p>
      </div>
    )
  }

  return (
    <div className='property-scroll framer-hide-scrollbar'>
      {/* Keyed by node id so per-node UI state (the min/max expanders, padding's
          expanded/collapsed side count) resets to its own defaults per selection,
          rather than carrying over from whatever was previously selected. */}
      <PropertySections key={primaryId ?? 'none'} fieldProps={fieldProps} />
    </div>
  )
}
