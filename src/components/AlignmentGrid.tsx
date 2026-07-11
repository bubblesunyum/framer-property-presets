import './AlignmentGrid.css'

const ORDER = ['start', 'center', 'end'] as const
type Order = (typeof ORDER)[number]

const SPACE_OPTIONS = ['space-between', 'space-around', 'space-evenly'] as const
const SPACE_LABELS: Record<(typeof SPACE_OPTIONS)[number], string> = {
  'space-between': 'between',
  'space-around': 'around',
  'space-evenly': 'evenly',
}

// Plain positional names for the 3×3 cells, so a screen reader announces something
// meaningful for buttons whose only visible content is a dot.
const ROW_NAMES = ['top', 'middle', 'bottom']
const COL_NAMES = ['left', 'center', 'right']
function cellLabel(col: number, row: number): string {
  if (col === 1 && row === 1) return 'Align center'
  return `Align ${ROW_NAMES[row]} ${COL_NAMES[col]}`
}

/** Value the combined align + distribute grid reads: the two stack keys it writes, plus
 *  the stack direction it needs to know which grid axis maps to which key. */
export interface AlignmentValue {
  direction: 'horizontal' | 'vertical'
  distribution: string | null
  alignment: string | null
}

export type AlignmentChange = {distribution: string; alignment: string}

interface AlignmentGridProps {
  value: AlignmentValue
  onChange: (next: AlignmentChange) => void
  /** Which page is showing — the 3×3 start/center/end grid, or the space-* alternates.
   *  Controlled by the parent (the pager arrows now live in the section header, not on
   *  the grid itself). */
  showAlternates: boolean
}

/** Framer-style combined align + distribute picker: a square 3×3 grid sets both the
 *  main-axis position (distribution) and cross-axis position (alignment) of a stack in
 *  one click. The parent's header arrows slide it up and out for a second panel — 3
 *  selectable representations of the space-between/around/evenly distributions the 3×3
 *  grid can't express. */
export function AlignmentGrid({value, onChange, showAlternates}: AlignmentGridProps) {
  const {direction, distribution, alignment} = value

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
                  aria-label={cellLabel(col, row)}
                  title={cellLabel(col, row)}
                  className={isSelected ? 'alignment-cell is-selected' : 'alignment-cell'}
                  onClick={() => onChange(cellValue(col, row))}
                >
                  {isSelected ? <Bars direction={direction} /> : <span className='alignment-dot' />}
                </button>
              )
            })}
          </div>
        </div>
        <div className={showAlternates ? 'alignment-slide is-alternates' : 'alignment-slide is-alternates is-away-below'}>
          <div className='alignment-alternates' role='radiogroup' aria-label='Distribution'>
            {SPACE_OPTIONS.map((option) => (
              <button
                key={option}
                type='button'
                role='radio'
                aria-checked={distribution === option}
                aria-label={`Distribute ${SPACE_LABELS[option]}`}
                className={distribution === option ? 'alignment-alt-cell is-selected' : 'alignment-alt-cell'}
                onClick={() => onChange({distribution: option, alignment: alignment ?? 'start'})}
                title={option.replace('space-', 'Space ')}
              >
                <SpaceBars distribution={option} direction={direction} />
                <span className='alignment-alt-label'>{SPACE_LABELS[option]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Up/down pager arrows for the alignment grid's two pages — rendered in the section
 *  header (see AlignmentZIndexRow), not on the grid. The arrow that would switch pages
 *  is tinted (primary) and clickable; the current page's own arrow is dimmed and inert. */
export function AlignmentPager({showAlternates, onChange}: {showAlternates: boolean; onChange: (next: boolean) => void}) {
  return (
    <div className='alignment-pager'>
      <button
        type='button'
        className={showAlternates ? 'alignment-pager-arrow is-active' : 'alignment-pager-arrow'}
        onClick={() => showAlternates && onChange(false)}
        disabled={!showAlternates}
        title='Start / Center / End'
        aria-label='Show start/center/end grid'
      >
        <AlignmentArrowIcon direction='up' />
      </button>
      <button
        type='button'
        className={showAlternates ? 'alignment-pager-arrow' : 'alignment-pager-arrow is-active'}
        onClick={() => !showAlternates && onChange(true)}
        disabled={showAlternates}
        title='Between / Around / Evenly'
        aria-label='Show more distribute options'
      >
        <AlignmentArrowIcon direction='down' />
      </button>
    </div>
  )
}

function AlignmentArrowIcon({direction}: {direction: 'up' | 'down'}) {
  return (
    <svg width='9' height='9' viewBox='0 0 9 9' fill='none'>
      <path
        d={direction === 'up' ? 'M2 5.5l2.5-2.5 2.5 2.5' : 'M2 3.5l2.5 2.5 2.5-2.5'}
        stroke='currentColor'
        strokeWidth='1.3'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
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

