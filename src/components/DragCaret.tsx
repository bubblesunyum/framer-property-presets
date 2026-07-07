import {useEffect, useRef} from 'react'
import './DragCaret.css'

interface DragCaretProps {
  value: number
  onChange: (value: number) => void
  /** Amount a single up/down click moves the value by. */
  step?: number
  /** Units the value moves per pixel dragged vertically — higher reads as "faster"
   *  (e.g. Opacity drags faster than Radius). */
  dragSensitivity?: number
  min?: number
  max?: number
}

/** Small vertically-stacked up/down caret pair, anchored to the right of a value field.
 *  A click nudges by `step`; pressing and dragging vertically adjusts continuously by
 *  `dragSensitivity` units per pixel (up increases, matching a physical slider/fader). */
export function DragCaret({value, onChange, step = 1, dragSensitivity = 1, min = -Infinity, max = Infinity}: DragCaretProps) {
  const dragState = useRef<{startY: number; startValue: number; dragged: boolean} | null>(null)

  const clamp = (next: number) => Math.min(Math.max(next, min), max)

  const startDrag = (event: React.PointerEvent) => {
    event.preventDefault()
    dragState.current = {startY: event.clientY, startValue: value, dragged: false}
    ;(event.target as Element).setPointerCapture?.(event.pointerId)
  }

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const drag = dragState.current
      if (!drag) return
      const delta = drag.startY - event.clientY
      if (Math.abs(delta) > 2) drag.dragged = true
      if (!drag.dragged) return
      onChange(clamp(Math.round(drag.startValue + delta * dragSensitivity)))
    }
    const handleUp = () => {
      dragState.current = null
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragSensitivity, min, max])

  const clickIfNotDragged = (delta: number) => () => {
    if (dragState.current?.dragged) return
    onChange(clamp(value + delta))
  }

  return (
    <div className='drag-caret' onPointerDown={startDrag}>
      <button type='button' className='drag-caret-button' tabIndex={-1} onClick={clickIfNotDragged(step)} aria-label='Increase'>
        <CaretUpIcon />
      </button>
      <button type='button' className='drag-caret-button' tabIndex={-1} onClick={clickIfNotDragged(-step)} aria-label='Decrease'>
        <CaretDownIcon />
      </button>
    </div>
  )
}

function CaretUpIcon() {
  return (
    <svg width='7' height='4' viewBox='0 0 7 4' fill='none'>
      <path d='M1 3.2 3.5.8 6 3.2' stroke='currentColor' strokeWidth='1.2' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  )
}

function CaretDownIcon() {
  return (
    <svg width='7' height='4' viewBox='0 0 7 4' fill='none'>
      <path d='M1 .8 3.5 3.2 6 .8' stroke='currentColor' strokeWidth='1.2' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  )
}
