import {useState, type ReactNode} from 'react'
import {EDITOR_ROWS, type EditorRow} from '../schema/editorLayout'
import type {PresetPropertyKey} from '../types/preset'
import {PinWidget} from './PinWidget'
import './PropertySections.css'
import {
  PropertyColumnPair,
  PropertyControlOnly,
  PropertyFieldPair,
  PropertyRow,
  renderControl,
  type FieldProps,
} from './PropertyRow'

type FieldPropsFor = (key: PresetPropertyKey) => FieldProps | null

/** Renders the full property form for a single node's draft — one combined Position &
 *  Size section (position control + conditional pin cross + Width/Height axes) plus the
 *  Layout section. Shared verbatim between the preset editor and the live Design panel;
 *  the only difference is the `fieldProps` builder each hands in. */
export function PropertySections({fieldProps}: {fieldProps: FieldPropsFor}) {
  return (
    <>
      <PositionSizeSection fieldProps={fieldProps} />
      <LayoutSection fieldProps={fieldProps} />
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

function PositionSizeSection({fieldProps}: {fieldProps: FieldPropsFor}) {
  const position = fieldProps('position')
  // The pin cross only applies once a layer is out of normal flow (any position mode
  // other than "relative"). The pin keys are always captured, so switching modes here
  // reveals/hides the cross without needing to backfill anything.
  const isPinned = position != null && position.value !== 'relative' && position.value != null
  const pins = {
    top: isPinned ? fieldProps('top') : null,
    right: isPinned ? fieldProps('right') : null,
    bottom: isPinned ? fieldProps('bottom') : null,
    left: isPinned ? fieldProps('left') : null,
  }
  const hasPins = Boolean(pins.top || pins.right || pins.bottom || pins.left)

  const width = fieldProps('width')
  const height = fieldProps('height')
  const hasSize = Boolean(width || height)

  return (
    <Section title='Position & Size' isEmpty={!position && !hasPins && !hasSize}>
      {position && <FullWidthControl field={position} />}
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
      {hasSize && (
        <div className='size-axes'>
          <SizeAxis main={width} min={fieldProps('minWidth')} max={fieldProps('maxWidth')} />
          <SizeAxis main={height} min={fieldProps('minHeight')} max={fieldProps('maxHeight')} />
        </div>
      )}
    </Section>
  )
}

/** One dimension column: the Width/Height field, with its own Min/Max fields tucked
 *  behind a small "min/max" expander directly underneath. */
function SizeAxis({main, min, max}: {main: FieldProps | null; min: FieldProps | null; max: FieldProps | null}) {
  const [open, setOpen] = useState(false)
  if (!main) return null
  const hasMinMax = Boolean(min || max)

  return (
    <div className='size-axis'>
      <label
        className={main.onToggleIncluded ? 'mini-field-label is-toggleable' : 'mini-field-label'}
        onClick={main.onToggleIncluded}
      >
        {main.descriptor.label}
      </label>
      <div className={main.included ? 'size-axis-field is-included' : 'size-axis-field'}>
        {renderControl(main.descriptor, main.value, main.onChange)}
      </div>
      {hasMinMax && (
        <>
          <button
            type='button'
            className='size-constraints-toggle'
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
          >
            <ChevronIcon />
            min/max
          </button>
          {open && (
            <div className='size-axis-minmax'>
              {min && <MinMaxField label='Min' field={min} />}
              {max && <MinMaxField label='Max' field={max} />}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function MinMaxField({label, field}: {label: string; field: FieldProps}) {
  return (
    <div className={field.included ? 'mini-field is-included' : 'mini-field'}>
      <label className='mini-field-label'>{label}</label>
      {renderControl(field.descriptor, field.value, field.onChange)}
    </div>
  )
}

function LayoutSection({fieldProps}: {fieldProps: FieldPropsFor}) {
  const rows = renderRows(EDITOR_ROWS.layout, fieldProps)
  return (
    <Section title='Layout' isEmpty={rows.length === 0}>
      {rows}
    </Section>
  )
}

/** A control that spans the whole row with no label column (Flow, Position) — its icons
 *  carry the meaning. Dims when excluded, same as a labelled row. */
function FullWidthControl({field}: {field: FieldProps}) {
  return (
    <div className={field.included ? 'property-fullwidth is-included' : 'property-fullwidth'}>
      {renderControl(field.descriptor, field.value, field.onChange)}
    </div>
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
      if ('solo' in row) {
        return row.solo.descriptor.fullWidth ? (
          <FullWidthControl key={index} field={row.solo} />
        ) : (
          <PropertyRow key={index} {...row.solo} />
        )
      }
      if ('pair' in row) return <PropertyFieldPair key={index} left={row.pair[0]} right={row.pair[1]} />
      return <PropertyColumnPair key={index} left={row.columns[0]} right={row.columns[1]} />
    })
}
