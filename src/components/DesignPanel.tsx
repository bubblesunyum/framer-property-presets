import {useIsAllowedTo, type CanvasNode} from 'framer-plugin'
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

/** How often the live-sync poll re-reads the node. Slower than it once was (600ms) to
 *  cut idle work, since there's no push-based "attributes changed" event in the SDK. */
const POLL_INTERVAL_MS = 1000

/** Shallow per-key equality over two property maps — every value here is a primitive
 *  (string/number/boolean/null), so a `!==` compare is exact and far cheaper than the
 *  double `JSON.stringify` it replaces on every poll tick. */
function shallowEqualProps(a: PresetProperties, b: PresetProperties): boolean {
  const aKeys = Object.keys(a) as PresetPropertyKey[]
  const bKeys = Object.keys(b) as PresetPropertyKey[]
  if (aKeys.length !== bKeys.length) return false
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false
  }
  return true
}

interface RectLike {
  getRect?: () => Promise<{width: number; height: number} | null>
  getParent?: () => Promise<RectLike | null>
  layout?: unknown
}

interface ComputedSize {
  width: number | null
  height: number | null
  parentWidth: number | null
  parentHeight: number | null
  parentIsStack: boolean | null
}

const EmptySize: ComputedSize = {
  width: null,
  height: null,
  parentWidth: null,
  parentHeight: null,
  parentIsStack: null,
}

/** Live edit mode: reflects the currently selected layer's properties and writes every
 *  change straight back to the canvas (to all selected layers that support the key).
 *  Reuses the same property form as the preset editor via PropertySections — there's no
 *  include/exclude here (every field is always active) and no Save; edits are live. */
export function DesignPanel({selection}: DesignPanelProps) {
  const primary = selection[0] ?? null
  const primaryId = (primary as {id?: string} | null)?.id ?? null
  // Writing to the canvas needs the `setAttributes` permission. When it's unavailable
  // (e.g. a Viewer role) the whole form goes read-only with an explanatory banner rather
  // than letting edits silently no-op — matching Framer's "disable edit actions when the
  // required permissions are unavailable".
  const canEdit = useIsAllowedTo('setAttributes')

  const [properties, setProperties] = useState<PresetProperties>(() =>
    primary ? captureFromNode(primary).properties : {},
  )
  const [computedSize, setComputedSize] = useState<ComputedSize>(EmptySize)

  // Re-seed the properties *synchronously during render* the moment the selection's id
  // changes — not in an effect, which runs after render. PropertySections is keyed by
  // this same id, so it remounts on a selection change; if the re-seed lagged behind in
  // an effect, that fresh mount would read the *previous* layer's properties for its
  // one-shot initializers (e.g. SizeAxes' min/max auto-open), leaving Min/Max expanded
  // on a layer that has no constraints. Setting state during render is the React-blessed
  // "adjust state when a prop changed" pattern (it re-renders before committing).
  const [seededId, setSeededId] = useState(primaryId)
  if (seededId !== primaryId) {
    setSeededId(primaryId)
    setProperties(primary ? captureFromNode(primary).properties : {})
    setComputedSize(EmptySize)
  }

  // Fetch the node's actual rendered size (shown as Width/Height's value in "Fit" mode)
  // and its parent's size (used to convert px↔% when the user switches units) — async,
  // so it stays in an effect.
  useEffect(() => {
    let active = true
    const node = primary as RectLike | null
    void (async () => {
      try {
        const rect = node?.getRect ? await node.getRect() : null
        let parentRect: {width: number; height: number} | null = null
        let parentIsStack: boolean | null = null
        if (node?.getParent) {
          const parent = await node.getParent()
          parentRect = parent?.getRect ? await parent.getRect() : null
          // "Fill" (a flex ratio) only applies inside a stack; note whether the parent is
          // one so the unit picker can hide fill when it doesn't apply.
          if (parent && 'layout' in parent) parentIsStack = parent.layout === 'stack'
        }
        if (!active) return
        setComputedSize({
          width: rect?.width ?? null,
          height: rect?.height ?? null,
          parentWidth: parentRect?.width ?? null,
          parentHeight: parentRect?.height ?? null,
          parentIsStack,
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
  // edits made through this one. Three things keep the polling cheap (per Framer's
  // review): it's paused whenever the plugin panel isn't visible, it runs on a relaxed
  // interval, and it diffs with a shallow per-key compare rather than a double
  // JSON.stringify. Each NumberField also guards its own local buffer against being
  // overwritten while focused (NumberField's `isFocusedRef`), so a poll landing mid-edit
  // can't stomp on a keystroke.
  useEffect(() => {
    if (!primary) return
    let intervalId: number | undefined

    const tick = () => {
      const fresh = captureFromNode(primary).properties
      setProperties((prev) => (shallowEqualProps(prev, fresh) ? prev : fresh))
    }
    const stop = () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId)
        intervalId = undefined
      }
    }
    // Only poll while the panel is actually visible. (Deliberately not gated on window
    // *focus*: the whole point is to reflect edits the user makes on the canvas, i.e.
    // while the plugin is unfocused — so pausing on blur would defeat it.)
    const sync = () => {
      if (document.visibilityState === 'visible') {
        if (intervalId === undefined) intervalId = window.setInterval(tick, POLL_INTERVAL_MS)
      } else {
        stop()
      }
    }
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', sync)
    }
  }, [primary, primaryId])

  // Stable identities are load-bearing, not just tidy: every field's onChange ultimately
  // closes over `commit`/`fieldProps`, and this panel re-renders on the live-sync poll
  // above whenever the node changed. A fresh function here on every render was cascading
  // into every descendant's effects tearing down and rebuilding their event listeners on
  // the same cadence, which showed up as a real bug: a drag-select gesture on
  // LengthField's unit-mode picker could have its window listeners torn down and rebuilt
  // mid-gesture.
  const commit = useCallback(
    (changes: PresetProperties) => {
      // No-op when editing isn't permitted — the form is also visually locked below, this
      // is the belt-and-suspenders guard so a stray interaction can't slip a write through.
      if (!canEdit) return
      setProperties((prev) => ({...prev, ...changes}))
      // applyAttributesToSelection surfaces its own throttled error notification on failure.
      void applyAttributesToSelection(changes, selection)
    },
    [selection, canEdit],
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
      {!canEdit && (
        <p className='design-panel-notice' role='status'>
          You don't have permission to edit this layer.
        </p>
      )}
      {/* Keyed by node id so per-node UI state (the min/max expanders, padding's
          expanded/collapsed side count) resets to its own defaults per selection,
          rather than carrying over from whatever was previously selected. When editing
          isn't allowed the whole form is dimmed and pointer interaction is blocked (the
          `design-panel-locked` class); `commit` is gated too, so a keyboard edit also
          no-ops. */}
      <div className={canEdit ? undefined : 'design-panel-locked'} aria-disabled={!canEdit}>
        <PropertySections key={primaryId ?? 'none'} fieldProps={fieldProps} />
      </div>
    </div>
  )
}
