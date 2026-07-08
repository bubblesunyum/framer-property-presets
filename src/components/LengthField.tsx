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
  /** Clearing the field (backspace to empty, then blur/Enter) unsets it via this
   *  callback rather than reverting — Min/Max constraints, which can genuinely be
   *  absent. Omitted for Width/Height, which always hold a value. */
  onClear?: () => void
  /** The parent's content size along this axis (px) — used to convert px↔% on a unit
   *  switch so the rendered size stays put. Null/undefined where there's no live parent
   *  to measure, in which case % conversions keep the current amount instead. */
  parentPx?: number | null
  /** The canvas viewport size along this axis (px) — used to convert to `vh`. */
  viewportPx?: number | null
}

const MODE_ORDER: LengthMode[] = ['px', '%', 'fit-content', 'fr', 'vh']
const MODE_LABELS: Record<LengthMode, string> = {'%': '%', px: 'px', fr: 'fill', 'fit-content': 'fit', vh: 'vh'}

function modesFor(axis: 'width' | 'height', constrained?: boolean): LengthMode[] {
  // Min/Max only ever toggles between px and % — no fill/fit (not valid constraint
  // values in the SDK) and no vh (deliberately kept out of the cycle to keep the
  // constraint fields simple; an existing vh value still parses and displays).
  if (constrained) return ['px', '%']
  return axis === 'height' ? MODE_ORDER : MODE_ORDER.filter((mode) => mode !== 'vh')
}

/** The amount to carry into `toMode` when the user switches units, chosen so the
 *  element's *rendered* size changes as little as possible. `renderedPx` (the node's
 *  actual on-screen size along this axis) is the anchor: expressing that same pixel
 *  size in the new unit keeps the box visually put. Fill is the exception — a flex
 *  ratio isn't a length, so it always resets to 1. When the pixel context needed for a
 *  given unit is unknown (no live node / no parent measured), the old amount is kept
 *  rather than guessing. */
export function convertedAmount(
  toMode: LengthMode,
  ctx: {currentAmount: number | null; renderedPx: number | null; parentPx?: number | null; viewportPx?: number | null},
): number | null {
  if (toMode === 'fr') return 1
  if (toMode === 'fit-content') return null
  const px = ctx.renderedPx
  if (px == null) return ctx.currentAmount
  if (toMode === 'px') return Math.round(px)
  if (toMode === '%') return ctx.parentPx ? Math.round((px / ctx.parentPx) * 1000) / 10 : ctx.currentAmount
  if (toMode === 'vh') return ctx.viewportPx ? Math.round((px / ctx.viewportPx) * 1000) / 10 : ctx.currentAmount
  return ctx.currentAmount
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
  onClear,
  parentPx,
  viewportPx,
}: LengthFieldProps) {
  const parsed = parseLength(value)
  const isFit = parsed.mode === 'fit-content'
  const hasValue = parsed.amount != null
  // Memoized so UnitButton's drag/click effect (which depends on `modes`/`onSelect`)
  // doesn't tear down and rebuild its window listeners on every render of this field —
  // it used to recreate a fresh array/closure every time regardless of whether the axis
  // or the current value actually changed, and under DesignPanel's 600ms live-sync poll
  // that meant the listeners were churning constantly, occasionally mid-gesture.
  const modes = useMemo(() => modesFor(axis, constrained), [axis, constrained])

  const setMode = useCallback(
    (mode: LengthMode) => {
      // Convert rather than reset, so switching units barely moves the rendered box
      // (see convertedAmount) — Fill is the lone exception, always 1.
      const amount = convertedAmount(mode, {currentAmount: parsed.amount, renderedPx: computedPx ?? null, parentPx, viewportPx})
      onChange(serializeLength(mode, amount))
    },
    [onChange, parsed.amount, computedPx, parentPx, viewportPx],
  )

  return (
    <div className='length-field-row'>
      <div className='length-field-pill'>
        {/* Label + value (left, the drag surface — dims together when unset/fit); the
            unit chip and trailing control (caret for W/H, clear ×/dot for Min/Max) sit
            right and stay full-opacity even when the value is dimmed. */}
        <NumberField
          value={isFit ? (computedPx ?? null) : parsed.amount}
          leftLabel={leftLabel}
          disabled={isFit}
          dim={!isFit && !hasValue}
          onChange={(amount) => onChange(serializeLength(parsed.mode, amount))}
          onClear={onClear}
        />
        <div className='length-field-trailing'>
          <UnitButton mode={parsed.mode} modes={modes} onSelect={setMode} />
          {expandable && (
            <button
              type='button'
              className={expanded ? 'length-field-expand is-expanded' : 'length-field-expand'}
              onClick={onToggleExpanded}
              aria-expanded={expanded}
              aria-label={expanded ? 'Hide min/max' : 'Show min/max'}
              title={expanded ? 'Hide min/max' : 'Show min/max'}
            >
              <ExpandCaretIcon />
            </button>
          )}
          {constrained &&
            (hasValue ? (
              <button
                type='button'
                className='length-field-clear'
                onClick={onClear}
                aria-label='Clear constraint'
                title='Clear'
              >
                <CloseIcon />
              </button>
            ) : (
              // Unset: a small inert dot in place of the clear button (matches the
              // reference — the field reads as "empty, tap to set" rather than "clearable").
              <span className='length-field-dot' aria-hidden='true' />
            ))}
        </div>
      </div>
    </div>
  )
}

function CloseIcon() {
  return (
    <svg width='12' height='12' viewBox='0 0 12 12' fill='none'>
      <path d='M3 3l6 6M9 3l-6 6' stroke='currentColor' strokeWidth='1.3' strokeLinecap='round' />
    </svg>
  )
}

function ExpandCaretIcon() {
  return (
    <svg width='8' height='8' viewBox='0 0 8 8' fill='none'>
      <path d='M1 3l3 3 3-3' stroke='currentColor' strokeWidth='1.3' strokeLinecap='round' strokeLinejoin='round' />
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
    // This button now lives *inside* NumberField (as its trailing node), whose own
    // pointerdown starts a value drag — without stopping propagation here, pressing
    // the unit button would also begin scrubbing the value underneath it.
    event.stopPropagation()
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
        type='button'
        className='length-field-unit-button'
        onPointerDown={handlePointerDown}
        onContextMenu={handleContextMenu}
      >
        <span className='length-field-unit-label'>{MODE_LABELS[mode]}</span>
      </button>
      {position &&
        createPortal(
          <div ref={listRef} className='length-field-unit-list' style={{top: position.top, left: position.left}}>
            {modes.map((option, index) => (
              <button
                key={option}
                type='button'
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
