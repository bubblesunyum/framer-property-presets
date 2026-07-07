import {useState} from 'react'
import './AlignmentGrid.css'

const ORDER = ['start', 'center', 'end'] as const
type Order = (typeof ORDER)[number]

const SPACE_OPTIONS = ['space-between', 'space-around', 'space-evenly'] as const

/** Value the combined align + distribute grid reads: the two stack keys it writes,
 *  plus the stack direction it needs to know which grid axis maps to which key, plus
 *  Wrap — folded in here too since its toggle button now lives directly under the
 *  grid's caret rather than as its own property row. */
export interface AlignmentValue {
  direction: 'horizontal' | 'vertical'
  distribution: string | null
  alignment: string | null
  wrapEnabled: boolean
}

export type AlignmentChange = {distribution: string; alignment: string} | {wrapEnabled: boolean}

interface AlignmentGridProps {
  value: AlignmentValue
  onChange: (next: AlignmentChange) => void
}

/** Framer-style combined align + distribute picker: a 3×3 grid sets both the main-axis
 *  position (distribution) and cross-axis position (alignment) of a stack in one click.
 *  The right caret slides that grid out and a second panel in — 3 selectable
 *  representations of the space-between/around/evenly distributions the 3×3 grid can't
 *  express — and flips 180° to slide back. A Wrap toggle sits underneath the caret. */
export function AlignmentGrid({value, onChange}: AlignmentGridProps) {
  const {direction, distribution, alignment, wrapEnabled} = value
  const [showAlternates, setShowAlternates] = useState(false)

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
      <div className='alignment-slider'>
        <div className={showAlternates ? 'alignment-slide is-away' : 'alignment-slide'}>
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
        </div>
        <div className={showAlternates ? 'alignment-slide is-alternates' : 'alignment-slide is-alternates is-away-right'}>
          <div className='alignment-alternates'>
            {SPACE_OPTIONS.map((option) => (
              <button
                key={option}
                type='button'
                className={distribution === option ? 'alignment-alt-cell is-selected' : 'alignment-alt-cell'}
                onClick={() => onChange({distribution: option, alignment: alignment ?? 'start'})}
                title={option.replace('space-', 'Space ')}
              >
                <SpaceBars distribution={option} direction={direction} />
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className='alignment-side-buttons'>
        <button
          type='button'
          className={showAlternates ? 'alignment-caret is-flipped' : 'alignment-caret'}
          onClick={() => setShowAlternates((prev) => !prev)}
          title={showAlternates ? 'Back to start/center/end' : 'More distribute options'}
          aria-label={showAlternates ? 'Back to start/center/end' : 'More distribute options'}
        >
          <CaretRightIcon />
        </button>
        <button
          type='button'
          className={wrapEnabled ? 'alignment-wrap-toggle is-active' : 'alignment-wrap-toggle'}
          onClick={() => onChange({wrapEnabled: !wrapEnabled})}
          title={wrapEnabled ? 'Wrap: on' : 'Wrap: off'}
          aria-label={wrapEnabled ? 'Disable wrap' : 'Enable wrap'}
        >
          <WrapIcon />
        </button>
      </div>
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

/** Approximate main-axis position (percent, in a 0–26 box) of each of 3 items under a
 *  space-* distribution — not pixel-exact CSS math, just enough to visually distinguish
 *  the three patterns (space-between pins the outer two to the edges, space-around
 *  gives the edges half a gap, space-evenly gives every gap, including the edges, the
 *  same size). */
const SPACE_POSITIONS: Record<string, [number, number, number]> = {
  'space-between': [2, 13, 24],
  'space-around': [5, 13, 21],
  'space-evenly': [6.5, 13, 19.5],
}

/** Small double-headed arrow between two adjacent bars, along the main axis — makes the
 *  "there's equal/unequal space here" reading explicit instead of leaving the viewer to
 *  infer it purely from the bars' relative positions. */
function ConnectorArrow({from, to, direction}: {from: number; to: number; direction: 'horizontal' | 'vertical'}) {
  if (direction === 'horizontal') {
    const y = 13
    return (
      <g stroke='currentColor' strokeWidth='1' strokeLinecap='round' opacity='0.6'>
        <line x1={from} y1={y} x2={to} y2={y} />
        <path d={`M${from + 1.6} ${y - 1.4}L${from} ${y}L${from + 1.6} ${y + 1.4}`} fill='none' />
        <path d={`M${to - 1.6} ${y - 1.4}L${to} ${y}L${to - 1.6} ${y + 1.4}`} fill='none' />
      </g>
    )
  }
  const x = 13
  return (
    <g stroke='currentColor' strokeWidth='1' strokeLinecap='round' opacity='0.6'>
      <line x1={x} y1={from} x2={x} y2={to} />
      <path d={`M${x - 1.4} ${from + 1.6}L${x} ${from}L${x + 1.4} ${from + 1.6}`} fill='none' />
      <path d={`M${x - 1.4} ${to - 1.6}L${x} ${to}L${x + 1.4} ${to - 1.6}`} fill='none' />
    </g>
  )
}

function SpaceBars({distribution, direction}: {distribution: string; direction: 'horizontal' | 'vertical'}) {
  const [p0, p1, p2] = SPACE_POSITIONS[distribution] ?? SPACE_POSITIONS['space-evenly']
  const barSize = direction === 'horizontal' ? {w: 1.6, h: 8} : {w: 8, h: 1.6}
  const barAt = (pos: number) =>
    direction === 'horizontal'
      ? {x: pos - barSize.w / 2, y: 13 - barSize.h / 2}
      : {x: 13 - barSize.w / 2, y: pos - barSize.h / 2}

  return (
    <svg width='26' height='26' viewBox='0 0 26 26' fill='none' className='alignment-alt-bars'>
      <ConnectorArrow from={p0} to={p1} direction={direction} />
      <ConnectorArrow from={p1} to={p2} direction={direction} />
      {[p0, p1, p2].map((pos, i) => {
        const {x, y} = barAt(pos)
        return <rect key={i} x={x} y={y} width={barSize.w} height={barSize.h} rx={0.8} fill='currentColor' />
      })}
    </svg>
  )
}

function CaretRightIcon() {
  return (
    <svg width='8' height='8' viewBox='0 0 8 8' fill='none'>
      <path d='M2 .8l3 3.2-3 3.2' stroke='currentColor' strokeWidth='1.3' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  )
}

function WrapIcon() {
  return (
    <svg width='14' height='14' viewBox='0 0 14 14' fill='none'>
      <path
        d='M1.5 4h8.5a2 2 0 0 1 0 4H7M1.5 4l2.2-2M1.5 4l2.2 2M1.5 10h8.5a2 2 0 0 0 0-4'
        stroke='currentColor'
        strokeWidth='1.2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}
