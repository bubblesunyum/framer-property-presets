import {useEffect, useRef, useState, type ReactNode} from 'react'
import {createDragValueTracker, DRAG_THRESHOLD_PX} from '../lib/dragValueTracker'
import './NumberField.css'

interface NumberFieldProps {
  value: number | null
  onChange: (value: number) => void
  min?: number
  max?: number
  /** Shown right after the value, reading naturally together ("375px") — hidden
   *  entirely while `disabled` since a disabled field's shown value isn't a real unit
   *  amount (see LengthField's Fit-mode use). */
  unit?: string
  /** Small dim label pinned to the far left, ahead of the value (e.g. a padding side:
   *  T/R/B/L, V/H) — always separated from the value by at least 6px. */
  leftLabel?: string
  /** Caps the field's width so it doesn't stretch to fill its row (Radius, Squircle,
   *  Opacity) — fields with a leftLabel (pins, padding sides) intentionally don't use
   *  this, since those already size via their grid. */
  compact?: boolean
  /** Overrides the default compact cap (92px) — e.g. Gap gets a wider 108px cap so it
   *  still reads comfortably next to Padding's own box. Ignored unless `compact`. */
  maxWidthPx?: number
  /** Drops `compact`'s default 46–92px clamp entirely so the field sizes to nothing
   *  but its own content (plus the pill's normal padding) — for a field whose value is
   *  always a short, single number with no natural "comfortable" width of its own
   *  (Z-Index), where the clamp just left dead space instead of helping. */
  hugContent?: boolean
  /** Colors the leftLabel with the position-pin accent (green) instead of its usual
   *  dim tertiary color — for Top/Right/Bottom/Left specifically, once that edge
   *  actually has a value (not while `dim`, which already conveys "unset" on its own). */
  accentLabel?: boolean
  /** Read-only: value is shown but not editable (e.g. Width/Height's computed size
   *  while their mode is "Fit", which has no real numeric value of its own). */
  disabled?: boolean
  /** Slightly dims the whole field — for a value that's currently unset (null) rather
   *  than disabled, e.g. an unpinned position edge or an unset min/max constraint. */
  dim?: boolean
  /** Units moved per pixel while dragging vertically anywhere on the field — higher
   *  reads as "faster" (e.g. Opacity drags faster than Radius). Set to 0 to disable
   *  drag-to-adjust entirely (rare — only where a vertical drag wouldn't make sense). */
  dragSensitivity?: number
  /** Centers the value+unit(+trailing) group instead of left-aligning it — the
   *  dimension fields' layout, where the W/H label and caret anchor the pill's edges
   *  and the content floats centered between them (see LengthField). */
  centered?: boolean
  /** Rendered inside the field right after the value/unit — LengthField's unit-mode
   *  button lives here so the whole field stays one drag surface (an interactive
   *  trailing control must stopPropagation on pointerdown to opt out of the drag). */
  trailing?: ReactNode
  /** Called when the field is committed empty (cleared then blurred/Enter) — for
   *  optional fields that can genuinely be unset (Min/Max constraints). Without it, an
   *  empty commit just reverts to the last value; with it, clearing means "unset". */
  onClear?: () => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

/** Plain numeric field — no separate drag handle; grabbing anywhere on the field and
 *  dragging vertically adjusts the value directly (up increases), while a plain click
 *  (no significant vertical movement before release) focuses and selects the text for
 *  overtyping. Keeps a local text buffer that only commits (and clamps) on blur/Enter —
 *  except an arrow-key nudge, which commits immediately so the canvas updates in real
 *  time as you nudge, the same way a direct edit or drag does.
 *
 *  Renders its own pill (background/radius) rather than relying on framer.css's native
 *  input chrome, so the left label, value, and unit can share one visually connected
 *  box with the value+unit reading naturally together, left-aligned. */
export function NumberField({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  unit,
  leftLabel,
  compact,
  maxWidthPx,
  hugContent,
  accentLabel,
  disabled,
  dim,
  dragSensitivity = 1,
  centered,
  trailing,
  onClear,
}: NumberFieldProps) {
  const [inputValue, setInputValue] = useState(value === null ? '' : String(value))
  const inputRef = useRef<HTMLInputElement>(null)
  const fieldRef = useRef<HTMLDivElement>(null)
  const isFocusedRef = useRef(false)
  const tracker = useRef(createDragValueTracker(value ?? 0)).current
  const wasDraggedRef = useRef(false)

  // The drag listeners are attached once (deps below are stable) — reading these from a
  // ref instead of the effect's closure means a fresh `onChange` (LengthField/SizeAxes
  // recreate theirs every render) no longer tears down and re-adds the window listeners
  // mid-drag, which was dropping move events and leaving the field's shown value behind
  // what was actually committed to the canvas.
  const dragRef = useRef({onChange, min, max, dragSensitivity})
  dragRef.current = {onChange, min, max, dragSensitivity}

  // Resync the local buffer whenever the value coming from outside changes — e.g. a
  // linked Width/Height edit (see PropertySections' aspect-ratio lock) or a
  // background poll picking up an edit made in Framer's own panel (see DesignPanel) —
  // but never while this field is focused, so an in-progress (uncommitted) keystroke
  // here can't be clobbered by a sync that raced it. Deliberately a `useEffect`, not a
  // plain during-render check: mutating a ref as a side effect of rendering breaks
  // under React StrictMode's dev-only double-invoke (the mutation "wins" on the
  // throwaway first pass, so the real pass never sees a change to react to, and the
  // display silently stops tracking the real value).
  useEffect(() => {
    tracker.sync(value ?? 0)
    if (isFocusedRef.current) return
    setInputValue(value === null ? '' : String(value))
  }, [value, tracker])

  const isNudgingRef = useRef(false)

  const commitRaw = (raw: string) => {
    const trimmed = raw.trim()
    if (trimmed === '') {
      // An empty commit means "unset" for a clearable field (Min/Max), or "no change"
      // (revert to the last value) for one that always holds a value.
      if (onClear) {
        setInputValue('')
        onClear()
      } else {
        setInputValue(value === null ? '' : String(value))
      }
      return
    }
    const parsed = Number(trimmed)
    if (Number.isNaN(parsed)) {
      setInputValue(value === null ? '' : String(value))
      return
    }
    const clamped = clamp(parsed, min, max)
    setInputValue(String(clamped))
    onChange(clamped)
  }

  const pointerDownYRef = useRef(0)

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || dragSensitivity === 0) return
    // Block the native focus-on-mousedown so a drag doesn't also drop a text cursor
    // into the field — the plain-click case focuses it manually on pointerup below.
    event.preventDefault()
    wasDraggedRef.current = false
    pointerDownYRef.current = event.clientY
    tracker.start(event.clientY)
    // Guard: the browser throws if the pointer is no longer active by the time capture
    // is requested (a real-but-rare race when a pointer ends between down and this line).
    try {
      ;(event.currentTarget as Element).setPointerCapture?.(event.pointerId)
    } catch {
      /* pointer already gone — window-level move/up listeners still drive the drag */
    }
  }

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!tracker.isDragging) return
      // Only counts as a drag once the pointer has actually moved past a small
      // threshold — otherwise a click that jitters by a pixel would wrongly skip
      // the focus-and-select-text behavior below.
      if (Math.abs(event.clientY - pointerDownYRef.current) < DRAG_THRESHOLD_PX) return
      if (!wasDraggedRef.current) {
        // First move past the threshold — this is now a scrub, not a click. Swap the
        // cursor to the up/down-resize glyph for the drag's duration: on the field (for
        // while the pointer is over it) and on <body> (so it holds as the pointer roams
        // off the field's own bounds mid-drag).
        document.body.style.cursor = 'ns-resize'
        if (fieldRef.current) fieldRef.current.style.cursor = 'ns-resize'
      }
      wasDraggedRef.current = true
      const {onChange: liveOnChange, min: liveMin, max: liveMax, dragSensitivity: sens} = dragRef.current
      const next = tracker.move(event.clientY, sens, liveMin, liveMax)
      // Update the shown value directly — the prop round-trip (onChange → commit → new
      // `value` → resync effect) is skipped while the field is focused, so a drag begun
      // after a click would otherwise scrub the canvas while the field's text sat still.
      setInputValue(String(next))
      liveOnChange(next)
    }
    const handleUp = () => {
      if (!tracker.isDragging) return
      tracker.end()
      document.body.style.cursor = ''
      if (fieldRef.current) fieldRef.current.style.cursor = ''
      if (!wasDraggedRef.current) {
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [tracker])

  const classes = ['number-field']
  if (compact) classes.push('is-compact')
  if (compact && hugContent) classes.push('is-hug')
  if (centered) classes.push('is-centered')
  if (disabled) classes.push('is-disabled')
  if (dim) classes.push('is-dim')

  // "px" is the implied default unit now — showing it everywhere was noise once %/fr/vh
  // (real, non-default units) already need to stay visible to disambiguate. Centralized
  // here rather than in every caller, so no descriptor/control needs to know about it.
  const showUnit = unit && unit !== 'px' && !disabled

  return (
    <div
      ref={fieldRef}
      className={classes.join(' ')}
      style={compact && maxWidthPx ? {maxWidth: maxWidthPx} : undefined}
      onPointerDown={handlePointerDown}
    >
      {leftLabel && (
        <span className={accentLabel && !dim ? 'number-field-label is-accent' : 'number-field-label'}>{leftLabel}</span>
      )}
      <input
        ref={inputRef}
        className='number-field-input'
        style={{width: `calc(${Math.max(inputValue.length, 1)}ch)`}}
        type='number'
        value={inputValue}
        disabled={disabled}
        onChange={(event) => {
          const raw = event.currentTarget.value
          setInputValue(raw)
          // A native up/down-arrow nudge fires this same onChange — commit it
          // immediately (real-time) rather than waiting for blur, same as a
          // direct edit's Enter/blur commit.
          if (isNudgingRef.current) {
            isNudgingRef.current = false
            commitRaw(raw)
          }
        }}
        onFocus={(event) => {
          isFocusedRef.current = true
          event.currentTarget.select()
        }}
        onBlur={(event) => {
          isFocusedRef.current = false
          commitRaw(event.currentTarget.value)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commitRaw(event.currentTarget.value)
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') isNudgingRef.current = true
        }}
        placeholder='–'
      />
      {showUnit && <span className='number-field-unit'>{unit}</span>}
      {trailing}
    </div>
  )
}
