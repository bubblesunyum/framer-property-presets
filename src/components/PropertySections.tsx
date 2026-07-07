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
 *  Size section (position control + conditional pin cross + Width/Height axes), the
 *  Layout section, and an Appearance section. Shared verbatim between the preset editor
 *  and the live Design panel; the only difference is the `fieldProps` builder each
 *  hands in. */
export function PropertySections({fieldProps}: {fieldProps: FieldPropsFor}) {
  return (
    <>
      <PositionSizeSection fieldProps={fieldProps} />
      <LayoutSection fieldProps={fieldProps} />
      <AppearanceSection fieldProps={fieldProps} />
    </>
  )
}

function Section({
  title,
  isEmpty,
  headerAction,
  children,
}: {
  title: string
  isEmpty: boolean
  headerAction?: ReactNode
  children: ReactNode
}) {
  return (
    <section className='property-section'>
      <div className='framer-divider' />
      <div className='property-section-header'>
        <h3 className='property-section-heading'>{title}</h3>
        {headerAction}
      </div>
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
 *  behind a small "min/max" expander directly underneath — defaults open if either is
 *  already explicitly set, so a layer with real constraints shows them right away. */
function SizeAxis({main, min, max}: {main: FieldProps | null; min: FieldProps | null; max: FieldProps | null}) {
  const hasMinMax = Boolean(min || max)
  const [open, setOpen] = useState(() => hasMinMax && (min?.value != null || max?.value != null))
  if (!main) return null

  return (
    <div className='size-axis'>
      <label
        className={main.onToggleIncluded ? 'mini-field-label is-toggleable' : 'mini-field-label'}
        onClick={main.onToggleIncluded}
      >
        {main.descriptor.label}
      </label>
      <div className={main.included ? 'size-axis-field is-included' : 'size-axis-field'}>
        {renderControl(main.descriptor, main.value, main.onChange, main.computedPx)}
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
            {!open && 'min/max'}
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

function AppearanceSection({fieldProps}: {fieldProps: FieldPropsFor}) {
  const visible = fieldProps('visible')
  const rows = renderRows(EDITOR_ROWS.appearance, fieldProps)
  return (
    <Section
      title='Appearance'
      isEmpty={rows.length === 0 && !visible}
      headerAction={visible && <VisibilityToggle field={visible} />}
    >
      {rows}
    </Section>
  )
}

/** Right-aligned eye icon in the Appearance section's own header, rather than a normal
 *  row — toggles the layer's visibility directly (there's no separate label here to
 *  drive edit mode's usual include/exclude click, so this button only ever edits the
 *  value; the dimming still reflects whether it's currently included in the preset). */
function VisibilityToggle({field}: {field: FieldProps}) {
  const isVisible = field.value !== false
  return (
    <button
      type='button'
      className={field.included ? 'appearance-visibility-toggle is-included' : 'appearance-visibility-toggle'}
      onClick={() => field.onChange(!isVisible)}
      title={isVisible ? 'Visible' : 'Hidden'}
      aria-label={isVisible ? 'Hide layer' : 'Show layer'}
    >
      {isVisible ? <EyeIcon /> : <EyeOffIcon />}
    </button>
  )
}

function EyeIcon() {
  return (
    <svg width='15' height='15' viewBox='0 0 15 15' fill='none'>
      <path
        d='M1 7.5S3.5 3 7.5 3 14 7.5 14 7.5 11.5 12 7.5 12 1 7.5 1 7.5z'
        stroke='currentColor'
        strokeWidth='1.2'
        strokeLinejoin='round'
      />
      <circle cx='7.5' cy='7.5' r='2.1' stroke='currentColor' strokeWidth='1.2' />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width='15' height='15' viewBox='0 0 15 15' fill='none'>
      <path
        d='M2 3l11 9M4.2 4.9C2.5 6 1 7.5 1 7.5S3.5 12 7.5 12c1.2 0 2.2-.3 3.1-.8M6.1 3.2c.45-.1.9-.2 1.4-.2 4 0 6.5 4.5 6.5 4.5s-.6 1.1-1.7 2.2'
        stroke='currentColor'
        strokeWidth='1.2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
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
