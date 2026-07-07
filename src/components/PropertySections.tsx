import {useState, type ReactNode} from 'react'
import {EDITOR_ROWS, type EditorRow} from '../schema/editorLayout'
import type {PresetPropertyKey} from '../types/preset'
import {LengthField} from './LengthField'
import {PinWidget} from './PinWidget'
import './PropertySections.css'
import {
  PropertyColumnPair,
  PropertyControlOnly,
  PropertyFieldPair,
  PropertyMiniField,
  PropertyRow,
  renderControl,
  type FieldProps,
} from './PropertyRow'

type FieldPropsFor = (key: PresetPropertyKey) => FieldProps | null

/** Renders the full property form for a single node's draft — one Layout section
 *  (position control, conditional pin cross, and Width/Height axes at the top, followed
 *  by Flow/Gap/Padding/Alignment/Z-Index/grid fields), an Appearance section, and an
 *  Interaction section. Shared verbatim between the preset editor and the live Design
 *  panel; the only difference is the `fieldProps` builder each hands in. */
export function PropertySections({fieldProps}: {fieldProps: FieldPropsFor}) {
  return (
    <>
      <LayoutSection fieldProps={fieldProps} />
      <AppearanceSection fieldProps={fieldProps} />
      <InteractionSection fieldProps={fieldProps} />
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

/** Position control + conditional pin cross + Width/Height axes — sits at the top of
 *  the Layout section (there's no separate "Position & Size" section anymore). */
function PositionAndSize({fieldProps}: {fieldProps: FieldPropsFor}) {
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

  if (!position && !hasPins && !hasSize) return null

  return (
    <>
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
      {hasSize && <SizeAxes width={width} height={height} fieldProps={fieldProps} />}
    </>
  )
}

/** "Dimensions" heading (with the aspect-ratio lock toggle at its far right) above
 *  Width and Height side by side — when locked, editing one proportionally scales the
 *  other to hold the ratio captured at the moment it was locked. */
function SizeAxes({width, height, fieldProps}: {width: FieldProps | null; height: FieldProps | null; fieldProps: FieldPropsFor}) {
  const [locked, setLocked] = useState(false)
  const [lockedRatio, setLockedRatio] = useState<number | null>(null)

  const numericOf = (field: FieldProps | null) => {
    const match = typeof field?.value === 'string' ? /^(-?\d*\.?\d+)/.exec(field.value) : null
    return match ? Number(match[1]) : null
  }

  const toggleLock = () => {
    if (!locked) {
      const w = numericOf(width)
      const h = numericOf(height)
      setLockedRatio(w != null && h != null && h !== 0 ? w / h : null)
    }
    setLocked((prev) => !prev)
  }

  const linkedWidth: FieldProps | null = width && {
    ...width,
    onChange: (next) => {
      width.onChange(next)
      if (locked && lockedRatio != null) {
        const nextAmount = numericOf({...width, value: next} as FieldProps)
        if (nextAmount != null && height?.value != null && typeof height.value === 'string') {
          const suffix = /[a-z%]+$/i.exec(height.value)?.[0] ?? 'px'
          height.onChange(`${Math.round(nextAmount / lockedRatio)}${suffix}`)
        }
      }
    },
  }
  const linkedHeight: FieldProps | null = height && {
    ...height,
    onChange: (next) => {
      height.onChange(next)
      if (locked && lockedRatio != null) {
        const nextAmount = numericOf({...height, value: next} as FieldProps)
        if (nextAmount != null && width?.value != null && typeof width.value === 'string') {
          const suffix = /[a-z%]+$/i.exec(width.value)?.[0] ?? 'px'
          width.onChange(`${Math.round(nextAmount * lockedRatio)}${suffix}`)
        }
      }
    },
  }

  const [openAxis, setOpenAxis] = useState<'width' | 'height' | null>(null)
  const minWidth = fieldProps('minWidth')
  const maxWidth = fieldProps('maxWidth')
  const minHeight = fieldProps('minHeight')
  const maxHeight = fieldProps('maxHeight')

  return (
    <div className='dimensions'>
      <div className='dimensions-header'>
        <h4 className='dimensions-header-title'>Dimensions</h4>
        <button
          type='button'
          className={locked ? 'size-axes-lock is-locked' : 'size-axes-lock'}
          onClick={toggleLock}
          title={locked ? 'Unlink width and height' : 'Lock aspect ratio'}
          aria-label={locked ? 'Unlink width and height' : 'Lock aspect ratio'}
        >
          <LinkIcon locked={locked} />
        </button>
      </div>
      <div className='size-axes'>
        <SizeAxis
          axis='width'
          leftLabel='W'
          main={linkedWidth}
          hasMinMax={Boolean(minWidth || maxWidth)}
          open={openAxis === 'width'}
          onToggleOpen={() => setOpenAxis((prev) => (prev === 'width' ? null : 'width'))}
        />
        <SizeAxis
          axis='height'
          leftLabel='H'
          main={linkedHeight}
          hasMinMax={Boolean(minHeight || maxHeight)}
          open={openAxis === 'height'}
          onToggleOpen={() => setOpenAxis((prev) => (prev === 'height' ? null : 'height'))}
        />
      </div>
      {/* Spans the full row width (not confined to just one axis's own half-column) —
          there's plenty of room for two comfortably-sized boxes here, unlike squeezing
          them into half of an already-narrow column. */}
      {openAxis === 'width' && (minWidth || maxWidth) && (
        <div className='size-axis-minmax'>
          {minWidth && <MinMaxField label='Min' field={minWidth} axis='width' />}
          {maxWidth && <MinMaxField label='Max' field={maxWidth} axis='width' />}
        </div>
      )}
      {openAxis === 'height' && (minHeight || maxHeight) && (
        <div className='size-axis-minmax'>
          {minHeight && <MinMaxField label='Min' field={minHeight} axis='height' />}
          {maxHeight && <MinMaxField label='Max' field={maxHeight} axis='height' />}
        </div>
      )}
    </div>
  )
}

function LinkIcon({locked}: {locked: boolean}) {
  if (locked) {
    return (
      <svg width='13' height='13' viewBox='0 0 13 13' fill='none'>
        <path
          d='M4.5 6.5v-2a2 2 0 1 1 4 0v2M4.5 6.5h4a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z'
          stroke='currentColor'
          strokeWidth='1.2'
          strokeLinejoin='round'
        />
      </svg>
    )
  }
  return (
    <svg width='13' height='13' viewBox='0 0 13 13' fill='none'>
      <path
        d='M4.5 5.2V4.5a2 2 0 1 1 4 0M4.5 6.5h4a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z'
        stroke='currentColor'
        strokeWidth='1.2'
        strokeLinejoin='round'
        opacity='0.55'
      />
    </svg>
  )
}

/** One dimension column: just the Width/Height field itself (with its own unit button
 *  and, when Min/Max apply, an expand caret built into the field — see LengthField).
 *  The Min/Max fields it reveals live outside this column entirely (see SizeAxes) —
 *  spanning the full row rather than being squeezed into this one narrow half. */
function SizeAxis({
  axis,
  leftLabel,
  main,
  hasMinMax,
  open,
  onToggleOpen,
}: {
  axis: 'width' | 'height'
  leftLabel: string
  main: FieldProps | null
  hasMinMax: boolean
  open: boolean
  onToggleOpen: () => void
}) {
  if (!main) return null

  return (
    <div className='size-axis'>
      <div className={main.included ? 'size-axis-field is-included' : 'size-axis-field'}>
        <LengthField
          value={typeof main.value === 'string' ? main.value : null}
          axis={axis}
          leftLabel={leftLabel}
          computedPx={main.computedPx}
          expandable={hasMinMax}
          expanded={open}
          onToggleExpanded={onToggleOpen}
          onChange={main.onChange}
        />
      </div>
    </div>
  )
}

function MinMaxField({label, field, axis}: {label: string; field: FieldProps; axis: 'width' | 'height'}) {
  return (
    <div className={field.included ? 'mini-field is-included' : 'mini-field'}>
      <label className='mini-field-label'>{label}</label>
      <LengthField
        value={typeof field.value === 'string' ? field.value : null}
        axis={axis}
        constrained
        onChange={field.onChange}
      />
    </div>
  )
}

function LayoutSection({fieldProps}: {fieldProps: FieldPropsFor}) {
  const positionAndSize = <PositionAndSize fieldProps={fieldProps} />
  const rows = renderRows(EDITOR_ROWS.layout, fieldProps)
  const hasPositionAndSize = fieldProps('position') || fieldProps('width') || fieldProps('height')
  return (
    <Section title='Layout' isEmpty={!hasPositionAndSize && rows.length === 0}>
      {positionAndSize}
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

function InteractionSection({fieldProps}: {fieldProps: FieldPropsFor}) {
  const rows = renderRows(EDITOR_ROWS.interaction, fieldProps)
  return (
    <Section title='Interaction' isEmpty={rows.length === 0}>
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

/** A control that spans the whole row with no label column — either bare (Position,
 *  self-evident from its icons) or with a small heading above it (Flow, Alignment — see
 *  each descriptor's `labelAbove`), rather than a label to its left, so the control
 *  itself can extend all the way to the section's left edge. Dims when excluded, same
 *  as a labelled row. */
function FullWidthControl({field}: {field: FieldProps}) {
  const showLabel = 'labelAbove' in field.descriptor && field.descriptor.labelAbove
  return (
    <div className={field.included ? 'property-fullwidth is-included' : 'property-fullwidth'}>
      {showLabel && <h4 className='property-fullwidth-label'>{field.descriptor.label}</h4>}
      {renderControl(field.descriptor, field.value, field.onChange)}
    </div>
  )
}

/** Gap (fixed max-width) beside Padding (fills whatever's left) — see the comment where
 *  this is chosen over the generic equal-halves `PropertyFieldPair`. */
function GapPaddingRow({gap, padding}: {gap: FieldProps | null; padding: FieldProps | null}) {
  if (!gap && !padding) return null
  return (
    <div className="gap-padding-row">
      {gap && (
        <div className="gap-padding-row-gap">
          <PropertyMiniField {...gap} />
        </div>
      )}
      {padding && (
        <div className="gap-padding-row-padding">
          <PropertyMiniField {...padding} />
        </div>
      )}
    </div>
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
      if ('pair' in row) {
        // Gap gets a fixed max-width (108px) and Padding fills whatever's left, rather
        // than splitting the row into two equal halves like every other paired row —
        // Padding's own box (2-4 side fields) needs the room, Gap's compact one doesn't.
        if (row.pair[0]?.descriptor.key === 'gap' && row.pair[1]?.descriptor.key === 'padding') {
          return <GapPaddingRow key={index} gap={row.pair[0]} padding={row.pair[1]} />
        }
        return <PropertyFieldPair key={index} left={row.pair[0]} right={row.pair[1]} />
      }
      return <PropertyColumnPair key={index} left={row.columns[0]} right={row.columns[1]} />
    })
}
