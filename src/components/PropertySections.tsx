import {useState, type ReactNode} from 'react'
import {EDITOR_ROWS, type EditorRow} from '../schema/editorLayout'
import type {PresetPropertyKey, PropertyGroup} from '../types/preset'
import {PinWidget} from './PinWidget'
import './PropertySections.css'
import {
  PropertyColumnPair,
  PropertyControlOnly,
  PropertyFieldPair,
  PropertyRow,
  type FieldProps,
} from './PropertyRow'

type FieldPropsFor = (key: PresetPropertyKey) => FieldProps | null

const GROUPS: {key: PropertyGroup; title: string}[] = [
  {key: 'position', title: 'Position'},
  {key: 'size', title: 'Size'},
  {key: 'layout', title: 'Layout'},
]

/** Renders the full Position/Size/Layout property form for a single node's draft.
 *  Shared verbatim between the preset editor and the live Design panel — the only
 *  thing that differs between the two is the `fieldProps` builder they hand in (which
 *  decides where a change goes and whether include/exclude toggles are shown). */
export function PropertySections({fieldProps}: {fieldProps: FieldPropsFor}) {
  return (
    <>
      {GROUPS.map(({key, title}) => {
        if (key === 'position') return <PositionSection key={key} title={title} fieldProps={fieldProps} />
        if (key === 'size') return <SizeSection key={key} title={title} fieldProps={fieldProps} />
        return <GenericSection key={key} title={title} rows={EDITOR_ROWS[key]} fieldProps={fieldProps} />
      })}
    </>
  )
}

function Section({title, isEmpty, children}: {title: string; isEmpty: boolean; children: ReactNode}) {
  return (
    <section className='property-section'>
      <div className='framer-divider' />
      <h3 className='property-section-heading'>{title}</h3>
      {isEmpty ? (
        <p className='property-section-empty'>This layer doesn't support {title.toLowerCase()} properties.</p>
      ) : (
        children
      )}
    </section>
  )
}

function GenericSection({title, rows, fieldProps}: {title: string; rows: EditorRow[]; fieldProps: FieldPropsFor}) {
  const rendered = renderRows(rows, fieldProps)
  return (
    <Section title={title} isEmpty={rendered.length === 0}>
      {rendered}
    </Section>
  )
}

function PositionSection({title, fieldProps}: {title: string; fieldProps: FieldPropsFor}) {
  const pins = {
    top: fieldProps('top'),
    right: fieldProps('right'),
    bottom: fieldProps('bottom'),
    left: fieldProps('left'),
  }
  const hasPins = Boolean(pins.top || pins.right || pins.bottom || pins.left)
  const rows = renderRows(EDITOR_ROWS.position, fieldProps)

  return (
    <Section title={title} isEmpty={!hasPins && rows.length === 0}>
      {hasPins && (
        <div className='position-cross'>
          {pins.top && (
            <div className='position-cross-top'>
              <PropertyControlOnly {...pins.top} />
            </div>
          )}
          <div className='position-cross-middle'>
            {pins.left && <PropertyControlOnly {...pins.left} />}
            <PinWidget
              top={pins.top?.value != null}
              right={pins.right?.value != null}
              bottom={pins.bottom?.value != null}
              left={pins.left?.value != null}
            />
            {pins.right && <PropertyControlOnly {...pins.right} />}
          </div>
          {pins.bottom && (
            <div className='position-cross-bottom'>
              <PropertyControlOnly {...pins.bottom} />
            </div>
          )}
        </div>
      )}
      {rows}
    </Section>
  )
}

/** Width/Height always show; Min/Max sit behind a small accordion underneath so the
 *  section stays compact until the constraints are actually wanted. */
function SizeSection({title, fieldProps}: {title: string; fieldProps: FieldPropsFor}) {
  const [showConstraints, setShowConstraints] = useState(false)

  const primaryLeft = present([fieldProps('width')])
  const primaryRight = present([fieldProps('height')])
  const constraintLeft = present([fieldProps('minWidth'), fieldProps('maxWidth')])
  const constraintRight = present([fieldProps('minHeight'), fieldProps('maxHeight')])

  const hasPrimary = primaryLeft.length > 0 || primaryRight.length > 0
  const hasConstraints = constraintLeft.length > 0 || constraintRight.length > 0

  return (
    <Section title={title} isEmpty={!hasPrimary && !hasConstraints}>
      {hasPrimary && <PropertyColumnPair left={primaryLeft} right={primaryRight} />}
      {hasConstraints && (
        <>
          <button
            type='button'
            className='size-constraints-toggle'
            aria-expanded={showConstraints}
            onClick={() => setShowConstraints((open) => !open)}
          >
            <ChevronIcon />
            {showConstraints ? 'Hide min & max' : 'Min & max'}
          </button>
          {showConstraints && <PropertyColumnPair left={constraintLeft} right={constraintRight} />}
        </>
      )}
    </Section>
  )
}

function ChevronIcon() {
  return (
    <svg width='8' height='8' viewBox='0 0 8 8' fill='none'>
      <path d='M2.5 1l3 3-3 3' stroke='currentColor' strokeWidth='1.3' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  )
}

function present(fields: (FieldProps | null)[]): FieldProps[] {
  return fields.filter((field): field is FieldProps => field !== null)
}

type RenderedRow =
  | {solo: FieldProps}
  | {pair: readonly [FieldProps | null, FieldProps | null]}
  | {columns: readonly [FieldProps[], FieldProps[]]}

function renderRows(rows: readonly EditorRow[], fieldProps: FieldPropsFor): ReactNode[] {
  return rows
    .map((row): RenderedRow | null => {
      if (typeof row === 'string') {
        const solo = fieldProps(row)
        return solo ? {solo} : null
      }
      if ('columns' in row) {
        const columns = [present(row.columns[0].map(fieldProps)), present(row.columns[1].map(fieldProps))] as const
        return columns[0].length > 0 || columns[1].length > 0 ? {columns} : null
      }
      const pair = [fieldProps(row[0]), fieldProps(row[1])] as const
      return pair[0] || pair[1] ? {pair} : null
    })
    .filter((row): row is RenderedRow => row !== null)
    .map((row, index) => {
      if ('solo' in row) return <PropertyRow key={index} {...row.solo} />
      if ('pair' in row) return <PropertyFieldPair key={index} left={row.pair[0]} right={row.pair[1]} />
      return <PropertyColumnPair key={index} left={row.columns[0]} right={row.columns[1]} />
    })
}
