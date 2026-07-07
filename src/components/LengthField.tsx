import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {createPortal} from 'react-dom'
import {DRAG_THRESHOLD_PX} from '../lib/dragValueTracker'
import {NumberField} from './NumberField'
import './LengthField.css'

type LengthMode = 'px' | '%' | 'fit-content' | 'fr' | 'vh'

interface LengthFieldProps {
  value: string | null
  onChange: (value: string) => void
  /** Which real dimension this is — Width never offers a viewport unit (the SDK's
   *  `WidthLength` has no vw variant at all), Height offers `vh`. */
  axis: 'width' | 'height'
  /** Min/Max constraints can only ever be px/% (width) or px/%/vh (height) — Fill and
   *  Fit aren't valid CSS constraint values in the SDK's Width/HeightConstraint types. */
  constrained?: boolean
  /** The node's actual rendered pixel size — shown, disabled, in place of a real value
   *  while mode is "Fit" (which has no numeric value of its own). Only ever populated
   *  where there's a live node to measure (create mode / the Design panel); absent in
   *  edit mode, where the field just shows an empty dash instead. */
  computedPx?: number | null
  /** Only the main Width/Height field (not Min/Max) shows the expand caret. */
  expandable?: boolean
  expanded?: boolean
  onToggleExpanded?: () => void
  /** "W"/"H" shown inside the field's left edge (Width/Height only — Min/Max read via
   *  their own heading above instead, same as pins/padding elsewhere in this app). */
  leftLabel?: string
}

const MODE_ORDER: LengthMode[] = ['px', '%', 'fit-content', 'fr', 'vh']
const MODE_LABELS: Record<LengthMode, string> = { '%': '%', px: 'px', fr: 'fill', 'fit-content': 'fit', vh: 'vh' }

function modesFor(axis: 'width' | 'height', constrained?: boolean): LengthMode[] {
  if (constrained) return axis === 'height' ? ['px', '%', 'vh'] : ['px', '%']
  return axis === 'height' ? MODE_ORDER : MODE_ORDER.filter((mode) => mode !== 'vh')
}

function parseLength(raw: string | null): {mode: LengthMode; amount: number | null} {
  if (raw === 'fit-content' || raw === 'fit-image') return {mode: 'fit-content', amount: null}
  if (typeof raw === 'string') {
    const match = /^(-?\d*\.?\d+)(px|%|fr|vh)$/.exec(raw)
    if (match) return {mode: match[2] as LengthMode, amount: Number(match[1])}
  }
  return {mode: 'px', amount: null}
}

function serializeLength(mode: LengthMode, amount: number | null): string {
  if (mode === 'fit-content') return 'fit-content'
  return `${amount ?? (mode === 'fr' ? 1 : 0)}${mode}`
}

/** Width/Height/Min/Max field matching Framer's own: a bare numeric value (read
 *  naturally as "375", with the unit conveyed by the button beside it, not appended to
 *  the text — Fill is the one exception, shown as "1fr" since that's how a flex ratio
 *  reads) plus an interactive unit button that cycles modes on a plain click, opens a
 *  picker dropdown on right-click, or on a press-and-drag opens that same dropdown in
 *  a hover-to-preview/release-to-select mode. Dragging anywhere else on the field
 *  (except the unit button and the optional expand caret) scrubs the value directly.
 *  "Fit" has no numeric value of its own, so it shows the node's actual rendered size
 *  instead, disabled rather than removed. */
export function LengthField({
  value,
  onChange,
  axis,
  constrained,
  computedPx,
  expandable,
  expanded,
  onToggleExpanded,
  leftLabel,
}: LengthFieldProps) {
  const parsed = parseLength(value)
  const isFit = parsed.mode === 'fit-content'
  // Memoized so UnitButton's drag/click effect (which depends on `modes`/`onSelect`)
  // doesn't tear down and rebuild its window listeners on every render of this field —
  // it used to recreate a fresh array/closure every time regardless of whether the axis
  // or the current value actually changed, and under DesignPanel's 600ms live-sync poll
  // that meant the listeners were churning constantly, occasionally mid-gesture.
  const modes = useMemo(() => modesFor(axis, constrained), [axis, constrained])

  const setMode = useCallback(
    (mode: LengthMode) => {
      // A Fill value is a flex ratio, not a length — carrying over whatever number the
      // field last held in px/% mode would read as a nonsensical flex ratio, so it
      // always resets to 1 rather than keeping the old amount.
      onChange(serializeLength(mode, mode === 'fr' ? 1 : parsed.amount))
    },
    [onChange, parsed.amount],
  )

  return (
    <div className="length-field-row">
      <div className="length-field-pill">
        <div className="length-field-value">
          <NumberField
            value={isFit ? (computedPx ?? null) : parsed.amount}
            unit={parsed.mode === 'fr' ? 'fr' : undefined}
            leftLabel={leftLabel}
            disabled={isFit}
            dim={!isFit && parsed.amount == null}
            compact
            onChange={(amount) => onChange(serializeLength(parsed.mode, amount))}
          />
        </div>
        <UnitButton mode={parsed.mode} modes={modes} onSelect={setMode} />
        {expandable && (
          <button
            type="button"
            className={expanded ? 'length-field-expand is-expanded' : 'length-field-expand'}
            onClick={onToggleExpanded}
            aria-expanded={expanded}
            aria-label={expanded ? 'Hide min/max' : 'Show min/max'}
            title={expanded ? 'Hide min/max' : 'Show min/max'}
          >
            <ExpandCaretIcon />
          </button>
        )}
      </div>
    </div>
  )
}

function ExpandCaretIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
      <path d="M1 3l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface UnitButtonProps {
  mode: LengthMode
  modes: LengthMode[]
  onSelect: (mode: LengthMode) => void
}

/** The unit "button" — reads as a plain label but is a full picker: a plain click (no
 *  significant movement between press and release) cycles to the next mode; right-click
 *  opens a dropdown to pick directly; pressing and dragging opens that same dropdown and
 *  tracks which option is under the pointer, so releasing over one selects it (a radial-
 *  menu-style drag-select) — releasing over nothing just closes it without changing
 *  anything. All three gestures are handled through one pointer-down→move→up sequence
 *  rather than three independent handlers, so "was this a click or a drag" only has one
 *  source of truth (`draggedRef`). */
function UnitButton({mode, modes, onSelect}: UnitButtonProps) {
  const [position, setPosition] = useState<{top: number; left: number} | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const draggedRef = useRef(false)
  // A plain ref, not state — set synchronously inside handlePointerDown so the very
  // next native pointerup (which can arrive before React has re-rendered and run an
  // effect) is never missed. Gating the window listeners themselves behind a
  // state-driven mount (as this used to) loses fast clicks: state updates aren't
  // guaranteed to flush before the browser's own pointerup fires, so a quick
  // click-and-release could complete before the listener was even attached.
  const pressedRef = useRef(false)
  const pressStartRef = useRef({x: 0, y: 0})
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const isOpen = position !== null

  const openAt = () => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    setPosition({top: rect.bottom + 4, left: Math.max(8, rect.right - 120)})
  }
  const close = () => {
    setPosition(null)
    setHoverIndex(null)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    draggedRef.current = false
    pressedRef.current = true
    pressStartRef.current = {x: event.clientX, y: event.clientY}
    ;(event.currentTarget as Element).setPointerCapture?.(event.pointerId)
  }

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    openAt()
  }

  // Always attached (mirrors NumberField's own drag listeners) — the actual pressed
  // state lives in `pressedRef`, checked synchronously, so there's no window between
  // pointerdown and this effect running where a pointerup could slip through unseen.
  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!pressedRef.current) return
      if (!draggedRef.current) {
        const moved = Math.hypot(event.clientX - pressStartRef.current.x, event.clientY - pressStartRef.current.y)
        if (moved < DRAG_THRESHOLD_PX) return
        draggedRef.current = true
        openAt()
      }
      const el = document.elementFromPoint(event.clientX, event.clientY)
      const optionEl = el?.closest('[data-unit-index]')
      setHoverIndex(optionEl ? Number(optionEl.getAttribute('data-unit-index')) : null)
    }
    const handleUp = () => {
      if (!pressedRef.current) return
      pressedRef.current = false
      if (draggedRef.current) {
        // Drag-release: select whatever's currently hovered, or just close if the
        // pointer was released outside every option.
        if (hoverIndex != null && modes[hoverIndex]) onSelect(modes[hoverIndex])
        draggedRef.current = false
        close()
      } else {
        const index = modes.indexOf(mode)
        onSelect(modes[(index + 1) % modes.length])
      }
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [hoverIndex, modes, mode, onSelect])

  // The right-click-opened dropdown (no drag involved) closes on an outside click/Escape
  // instead — a plain click-to-select path, distinct from the drag-release path above.
  useEffect(() => {
    if (!isOpen || draggedRef.current) return
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (listRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      close()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('mousedown', handleOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="length-field-unit-button"
        onPointerDown={handlePointerDown}
        onContextMenu={handleContextMenu}
      >
        <span className="length-field-unit-label">{MODE_LABELS[mode]}</span>
      </button>
      {position &&
        createPortal(
          <div ref={listRef} className="length-field-unit-list" style={{top: position.top, left: position.left}}>
            {modes.map((option, index) => (
              <button
                key={option}
                type="button"
                data-unit-index={index}
                className={
                  option === mode
                    ? 'length-field-unit-option is-active'
                    : index === hoverIndex
                      ? 'length-field-unit-option is-hovered'
                      : 'length-field-unit-option'
                }
                onClick={() => {
                  onSelect(option)
                  close()
                }}
              >
                {MODE_LABELS[option]}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}

