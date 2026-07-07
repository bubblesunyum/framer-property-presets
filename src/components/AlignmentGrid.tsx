import {useEffect, useRef, useState} from 'react'
import {createPortal} from 'react-dom'
import './AlignmentGrid.css'

const ORDER = ['start', 'center', 'end'] as const
type Order = (typeof ORDER)[number]

/** Value the combined align + distribute grid reads: the two stack keys it writes,
 *  plus the stack direction it needs to know which grid axis maps to which key. */
export interface AlignmentValue {
  direction: 'horizontal' | 'vertical'
  distribution: string | null
  alignment: string | null
}

interface AlignmentGridProps {
  value: AlignmentValue
  onChange: (next: {distribution: string; alignment: string}) => void
}

const SPACE_OPTIONS = [
  {value: 'space-between', label: 'Space Between'},
  {value: 'space-around', label: 'Space Around'},
  {value: 'space-evenly', label: 'Space Evenly'},
]

/** Framer-style combined align + distribute picker: one 3×3 grid that sets both the
 *  main-axis position (distribution) and the cross-axis position (alignment) of a
 *  stack in a single click. Which axis is which depends on direction — for a row the
 *  columns are distribution and the rows are alignment; for a column it's flipped.
 *  Only start/center/end are reachable through the grid itself; the three space-*
 *  distributions live behind the settings menu beside it and swap the grid out for a
 *  dedicated visualization once picked (see SpaceVisualization below). */
export function AlignmentGrid({value, onChange}: AlignmentGridProps) {
  const {direction, distribution, alignment} = value
  const isSpaceMode = typeof distribution === 'string' && distribution.startsWith('space-')

  const cellValue = (col: number, row: number) =>
    direction === 'horizontal'
      ? {distribution: ORDER[col], alignment: ORDER[row]}
      : {distribution: ORDER[row], alignment: ORDER[col]}

  const distIndex = ORDER.indexOf(distribution as Order)
  const alignIndex = ORDER.indexOf(alignment as Order)
  const selected =
    distIndex < 0 || alignIndex < 0
      ? null
      : direction === 'horizontal'
        ? {col: distIndex, row: alignIndex}
        : {col: alignIndex, row: distIndex}

  return (
    <div className='alignment-grid-row'>
      <div className='alignment-grid-area'>
        {isSpaceMode ? (
          <SpaceVisualization
            distribution={distribution}
            direction={direction}
            onClear={() => onChange({distribution: 'start', alignment: alignment ?? 'start'})}
          />
        ) : (
          <div className='alignment-grid' role='grid'>
            {Array.from({length: 9}, (_, i) => {
              const row = Math.floor(i / 3)
              const col = i % 3
              const isSelected = selected?.col === col && selected?.row === row
              return (
                <button
                  key={i}
                  type='button'
                  role='gridcell'
                  aria-selected={isSelected}
                  className={isSelected ? 'alignment-cell is-selected' : 'alignment-cell'}
                  onClick={() => onChange(cellValue(col, row))}
                >
                  {isSelected ? <Bars direction={direction} /> : <span className='alignment-dot' />}
                </button>
              )
            })}
          </div>
        )}
      </div>
      <AlignmentSettingsMenu onSelect={(dist) => onChange({distribution: dist, alignment: alignment ?? 'start'})} />
    </div>
  )
}

/** The selected cell shows the stacked items as little bars, perpendicular to the main
 *  axis — a row lays them out as vertical bars side by side, a column as horizontal
 *  bars top to bottom. */
function Bars({direction}: {direction: 'horizontal' | 'vertical'}) {
  if (direction === 'horizontal') {
    return (
      <svg width='14' height='14' viewBox='0 0 14 14' fill='none' className='alignment-bars'>
        <rect x='2' y='3' width='2.4' height='8' rx='1.2' fill='currentColor' />
        <rect x='5.8' y='3' width='2.4' height='8' rx='1.2' fill='currentColor' />
        <rect x='9.6' y='3' width='2.4' height='8' rx='1.2' fill='currentColor' />
      </svg>
    )
  }
  return (
    <svg width='14' height='14' viewBox='0 0 14 14' fill='none' className='alignment-bars'>
      <rect x='3' y='2' width='8' height='2.4' rx='1.2' fill='currentColor' />
      <rect x='3' y='5.8' width='8' height='2.4' rx='1.2' fill='currentColor' />
      <rect x='3' y='9.6' width='8' height='2.4' rx='1.2' fill='currentColor' />
    </svg>
  )
}

/** Approximate main-axis position (percent) of each of 3 items under a space-*
 *  distribution — not pixel-exact CSS math, just enough to visually distinguish the
 *  three patterns (space-between pins the outer two to the edges, space-around gives
 *  the edges half a gap, space-evenly gives every gap, including the edges, the same
 *  size). */
const SPACE_POSITIONS: Record<string, [number, number, number]> = {
  'space-between': [4, 50, 96],
  'space-around': [17, 50, 83],
  'space-evenly': [25, 50, 75],
}

function SpaceVisualization({
  distribution,
  direction,
  onClear,
}: {
  distribution: string
  direction: 'horizontal' | 'vertical'
  onClear: () => void
}) {
  const positions = SPACE_POSITIONS[distribution] ?? SPACE_POSITIONS['space-evenly']
  return (
    <div className='alignment-space-viz'>
      {positions.map((pct, i) => (
        <span
          key={i}
          className={direction === 'horizontal' ? 'alignment-space-bar is-horizontal' : 'alignment-space-bar is-vertical'}
          style={direction === 'horizontal' ? {left: `${pct}%`} : {top: `${pct}%`}}
        />
      ))}
      <button type='button' className='alignment-space-clear' onClick={onClear}>
        Clear
      </button>
    </div>
  )
}

function SettingsIcon() {
  return (
    <svg width='14' height='14' viewBox='0 0 14 14' fill='none'>
      <circle cx='7' cy='2.5' r='1.3' fill='currentColor' />
      <circle cx='7' cy='7' r='1.3' fill='currentColor' />
      <circle cx='7' cy='11.5' r='1.3' fill='currentColor' />
    </svg>
  )
}

/** Small icon-button + portaled popover offering the three distribute options the 3×3
 *  grid can't express (space-between/around/evenly) — same portal/position/outside-
 *  click pattern as Dropdown.tsx. */
function AlignmentSettingsMenu({onSelect}: {onSelect: (value: string) => void}) {
  const [position, setPosition] = useState<{top: number; left: number} | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const isOpen = position !== null
  const close = () => setPosition(null)
  const open = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    setPosition({top: rect.bottom + 4, left: Math.max(8, rect.right - 168)})
  }

  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (listRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      close()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <>
      <button
        type='button'
        ref={triggerRef}
        className='alignment-settings-trigger'
        onClick={() => (isOpen ? close() : open())}
        title='More distribute options'
        aria-label='More distribute options'
      >
        <SettingsIcon />
      </button>
      {position &&
        createPortal(
          <div ref={listRef} className='alignment-settings-list' style={{top: position.top, left: position.left}}>
            {SPACE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type='button'
                className='alignment-settings-option'
                onClick={() => {
                  onSelect(option.value)
                  close()
                }}
              >
                {option.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  )
}
