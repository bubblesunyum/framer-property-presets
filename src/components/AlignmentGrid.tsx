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

/** Framer-style combined align + distribute picker: one 3×3 grid that sets both the
 *  main-axis position (distribution) and the cross-axis position (alignment) of a
 *  stack in a single click. Which axis is which depends on direction — for a row the
 *  columns are distribution and the rows are alignment; for a column it's flipped.
 *  Only start/center/end are expressible here; the space-* distributions have no cell. */
export function AlignmentGrid({value, onChange}: AlignmentGridProps) {
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
