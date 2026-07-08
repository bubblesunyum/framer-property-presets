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
  /** Min/Max constraints — px/% for both axes, plus vh for height (the SDK's
   *  `HeightConstraint` = px|%|vh). Fill and Fit aren't valid constraint values. */
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
  /** "W"/"H"/"MIN"/"MAX" shown at the field's left edge. */
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
  /** Whether the node's parent is a stack (flex) layout. "Fill" (a flex ratio) only
   *  applies inside a stack, so it's dropped from the unit options when this is
   *  explicitly `false`. Unknown (null/undefined) keeps every option — better to allow a
   *  unit the host will reject than to wrongly hide a valid one. */
  parentIsStack?: boolean | null
}

const MODE_ORDER: LengthMode[] = ['px', '%', 'fit-content', 'fr', 'vh']
const MODE_LABELS: Record<LengthMode, string> = {'%': '%', px: 'px', fr: 'fill', 'fit-content': 'fit', vh: 'vh'}

function modesFor(axis: 'width' | 'height', constrained: boolean | undefined, parentIsStack: boolean | null | undefined): LengthMode[] {
  // Min/Max: px/% for both axes, plus vh for height (per the SDK's HeightConstraint).
  // No fill/fit — not valid constraint values.
  if (constrained) return axis === 'height' ? ['px', '%', 'vh'] : ['px', '%']
  // Width has no viewport unit at all; height gets vh.
  let modes = axis === 'height' ? MODE_ORDER : MODE_ORDER.filter((mode) => mode !== 'vh')
  // Fill is a flex ratio — only valid when the parent is a stack. Hide it otherwise.
  if (parentIsStack === false) modes = modes.filter((mode) => mode !== 'fr')
  return modes
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

/** Width/Height/Min/Max field matching Framer's own: a left label, then the value and
 *  the unit each in their own chip, then a trailing control (the Min/Max expand caret
 *  for W/H, a clear ×/placeholder dot for Min/Max). The value chip is an editable,
 *  drag-to-scrub number; the unit chip cycles modes on a tap, opens a picker on a
 *  press-and-hold (or a drag), and converts the value so the rendered box barely moves.
 *  "Fit" has no numeric value of its own, so the value chip shows the node's actual
 *  rendered size instead, disabled rather than removed. */
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
  parentIsStack,
}: LengthFieldProps) {
  const parsed = parseLength(value)
  const isFit = parsed.mode === 'fit-content'
  const hasValue = parsed.amount != null
  const pillRef = useRef<HTMLDivElement>(null)
  const modes = useMemo(() => modesFor(axis, constrained, parentIsStack), [axis, constrained, parentIsStack])

  const setMode = useCallback(
    (mode: LengthMode) => {
      // Convert rather than reset, so switching units barely moves the rendered box
      // (see convertedAmount) — Fill is the lone exception, always 1.
      const amount = convertedAmount(mode, {
        currentAmount: parsed.amount,
        renderedPx: computedPx ?? null,
        parentPx,
        viewportPx,
      })
      onChange(serializeLength(mode, amount))
    },
    [onChange, parsed.amount, computedPx, parentPx, viewportPx],
  )

  // After a unit change, focus + select the value chip's input so it's ready to overtype.
  const focusValue = useCallback(() => {
    const input = pillRef.current?.querySelector<HTMLInputElement>('.number-field-input')
    if (!input || input.disabled) return
    input.focus()
    input.select()
  }, [])

  return (
    <div className='length-field-row'>
      <div className='length-field-pill' ref={pillRef}>
        <div className='length-field-main'>
          {leftLabel && (
            <span className={!isFit && !hasValue ? 'length-field-label is-dim' : 'length-field-label'} onPointerDown={focusValue}>
              {leftLabel}
            </span>
          )}
          <div className='length-field-value-unit'>
            {/* Value chip — editable + drag-to-scrub. */}
            <NumberField
              value={isFit ? (computedPx ?? null) : parsed.amount}
              disabled={isFit}
              dim={!isFit && !hasValue}
              centered
              hugContent
              compact
              onChange={(amount) => onChange(serializeLength(parsed.mode, amount))}
              onClear={onClear}
            />
            <UnitButton mode={parsed.mode} modes={modes} onSelect={setMode} onAfterSelect={focusValue} />
          </div>
        </div>
        <div className='length-field-trailing'>
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
              <div className='length-field-dot-area'>
                <span className='length-field-dot' aria-hidden='true' />
              </div>
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

const HOLD_TO_OPEN_MS = 160
const CYCLE_COMMIT_MS = 260

interface UnitButtonProps {
  mode: LengthMode
  modes: LengthMode[]
  onSelect: (mode: LengthMode) => void
  onAfterSelect?: () => void
}

/** The unit chip — a tap cycles to the next mode, a press-and-hold (or a drag) opens a
 *  picker dropdown right under the chip. Two touches of polish:
 *  - Cycling is *debounced* (CYCLE_COMMIT_MS): rapid taps only commit the final mode, so
 *    the value converts once (from the original size) rather than through each
 *    intermediate unit — the box stays the same size as you spin through options.
 *  - The dropdown opens on hold (HOLD_TO_OPEN_MS) or drag, sits directly beneath the
 *    chip, and a drag-release picks whatever option is under the pointer. */
function UnitButton({mode, modes, onSelect, onAfterSelect}: UnitButtonProps) {
  const [position, setPosition] = useState<{top: number; left: number} | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  // Optimistic mode shown while a debounced cycle is pending (before it commits).
  const [displayMode, setDisplayMode] = useState(mode)
  const displayModeRef = useRef(mode)
  const pressedRef = useRef(false)
  const draggedRef = useRef(false)
  const openedRef = useRef(false)
  const pressStartRef = useRef({x: 0, y: 0})
  const holdTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const cycleTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Keep refs of the latest callbacks so the always-on pointer listeners never read a
  // stale closure (LengthField hands in a fresh onSelect every render).
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const onAfterSelectRef = useRef(onAfterSelect)
  onAfterSelectRef.current = onAfterSelect

  const isOpen = position !== null

  // Resync the optimistic display to the committed mode whenever the latter changes (or a
  // pending cycle just landed).
  useEffect(() => {
    setDisplayMode(mode)
    displayModeRef.current = mode
  }, [mode])

  const openAt = () => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    // Directly beneath the chip, left edges aligned (kept on-screen at the left).
    setPosition({top: rect.bottom + 4, left: Math.max(8, rect.left)})
    openedRef.current = true
  }
  const close = () => {
    setPosition(null)
    setHoverIndex(null)
    openedRef.current = false
  }

  const commitMode = (next: LengthMode) => {
    onSelectRef.current(next)
    onAfterSelectRef.current?.()
  }

  const cycleOnce = () => {
    const current = displayModeRef.current
    const next = modes[(modes.indexOf(current) + 1) % modes.length]
    setDisplayMode(next)
    displayModeRef.current = next
    // Debounce: only the final mode of a fast tap-run is applied, so the conversion runs
    // once against the original (still-uncommitted) value.
    clearTimeout(cycleTimerRef.current)
    cycleTimerRef.current = setTimeout(() => commitMode(next), CYCLE_COMMIT_MS)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    // The chip lives inside NumberField's value pill area; stop the parent's drag.
    event.stopPropagation()
    draggedRef.current = false
    openedRef.current = false
    pressedRef.current = true
    pressStartRef.current = {x: event.clientX, y: event.clientY}
    try {
      ;(event.currentTarget as Element).setPointerCapture?.(event.pointerId)
    } catch {
      /* pointer already gone */
    }
    // Hold → open the dropdown (no drag required).
    clearTimeout(holdTimerRef.current)
    holdTimerRef.current = setTimeout(() => {
      if (pressedRef.current && !openedRef.current) openAt()
    }, HOLD_TO_OPEN_MS)
  }

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    openAt()
  }

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!pressedRef.current) return
      if (!draggedRef.current) {
        const moved = Math.hypot(event.clientX - pressStartRef.current.x, event.clientY - pressStartRef.current.y)
        if (moved < DRAG_THRESHOLD_PX) return
        draggedRef.current = true
        clearTimeout(holdTimerRef.current)
        if (!openedRef.current) openAt()
      }
      if (!openedRef.current) return
      const el = document.elementFromPoint(event.clientX, event.clientY)
      const optionEl = el?.closest('[data-unit-index]')
      setHoverIndex(optionEl ? Number(optionEl.getAttribute('data-unit-index')) : null)
    }
    const handleUp = () => {
      if (!pressedRef.current) return
      pressedRef.current = false
      clearTimeout(holdTimerRef.current)
      if (openedRef.current) {
        // Dropdown is open: a release over an option picks it; a drag that ends off any
        // option closes; a plain hold-open (no drag) stays open for a follow-up click.
        if (hoverIndex != null && modes[hoverIndex]) {
          commitMode(modes[hoverIndex])
          close()
        } else if (draggedRef.current) {
          close()
        }
      } else {
        // Quick tap → cycle (debounced).
        cycleOnce()
      }
      draggedRef.current = false
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoverIndex, modes])

  useEffect(
    () => () => {
      clearTimeout(holdTimerRef.current)
      clearTimeout(cycleTimerRef.current)
    },
    [],
  )

  // Outside click / Escape closes the dropdown.
  useEffect(() => {
    if (!isOpen) return
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
        <span className='length-field-unit-label'>{MODE_LABELS[displayMode]}</span>
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
                  option === displayMode
                    ? 'length-field-unit-option is-active'
                    : index === hoverIndex
                      ? 'length-field-unit-option is-hovered'
                      : 'length-field-unit-option'
                }
                onClick={() => {
                  commitMode(option)
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
