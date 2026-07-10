import {useState, type ReactNode} from 'react'
import {EDITOR_ROWS, type EditorRow} from '../schema/editorLayout'
import type {PresetPropertyKey} from '../types/preset'
import {AlignmentGrid, AlignmentPager, type AlignmentValue} from './AlignmentGrid'
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
  // A section with nothing to show is hidden entirely (no heading, no divider) rather than
  // rendering an empty-state message — so shelving the synthetic-only fields also removes
  // the now-empty Interaction section, and any section a given layer doesn't support just
  // doesn't appear.
  if (isEmpty) return null
  return (
    <>
      <section className='property-section'>
        <div className='property-section-header'>
          <h3 className='property-section-heading'>{title}</h3>
          {headerAction}
        </div>
        {children}
      </section>
      <div className='framer-divider' />
    </>
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
        <div className='position-pins'>
          <PinWidget
            top={pins.top?.value != null}
            right={pins.right?.value != null}
            bottom={pins.bottom?.value != null}
            left={pins.left?.value != null}
          />
          {/* 2×2 grid to the right of the widget — Left/Top on top, Right/Bottom below,
              matching the reference layout. */}
          <div className='position-pins-grid'>
            {pins.left && <PropertyControlOnly {...pins.left} />}
            {pins.top && <PropertyControlOnly {...pins.top} />}
            {pins.right && <PropertyControlOnly {...pins.right} />}
            {pins.bottom && <PropertyControlOnly {...pins.bottom} />}
          </div>
        </div>
      )}
      {hasSize && <SizeAxes width={width} height={height} fieldProps={fieldProps} />}
    </>
  )
}

/** "Dimensions" heading (with the aspect-ratio lock toggle at its far right) above
 *  Width and Height side by side — when locked, editing one proportionally scales the
 *  other to hold the ratio captured at the moment it was locked. */
function SizeAxes({
  width,
  height,
  fieldProps,
}: {
  width: FieldProps | null
  height: FieldProps | null
  fieldProps: FieldPropsFor
}) {
  const [locked, setLocked] = useState(false)
  const [lockedRatio, setLockedRatio] = useState<number | null>(null)

  // Only concrete lengths (px/%) take part in aspect-ratio linking. Fill ("1fr") is a
  // flex ratio, not a size — reading its "1" as a dimension made locking collapse the
  // other axis to ~1px (a real bug: width shown as 1px while Framer rendered 270px).
  // Fit has no length either. Both return null here, so the lock simply does nothing
  // until both axes hold real px/% values.
  const numericOf = (field: FieldProps | null) => {
    const v = typeof field?.value === 'string' ? field.value : null
    if (!v || !/^-?\d*\.?\d+(px|%)$/.test(v)) return null
    const match = /^(-?\d*\.?\d+)/.exec(v)
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

  const minWidth = fieldProps('minWidth')
  const maxWidth = fieldProps('maxWidth')
  const minHeight = fieldProps('minHeight')
  const maxHeight = fieldProps('maxHeight')

  // Each axis's Min/Max expands independently, so both can be open at once — their
  // fields sit under their own axis's column. Auto-open an axis whose min or max is
  // already set on selection (this component is keyed by node id, so the initializer
  // re-runs per selection), so an existing constraint is visible without a manual tap.
  const hasVal = (field: FieldProps | null) => typeof field?.value === 'string' && field.value.length > 0
  const [openAxes, setOpenAxes] = useState(() => ({
    width: hasVal(minWidth) || hasVal(maxWidth),
    height: hasVal(minHeight) || hasVal(maxHeight),
  }))
  const toggleAxis = (axis: 'width' | 'height') => setOpenAxes((prev) => ({...prev, [axis]: !prev[axis]}))
  const widthOpen = openAxes.width && Boolean(minWidth || maxWidth)
  const heightOpen = openAxes.height && Boolean(minHeight || maxHeight)

  const parentWidthPx = width?.parentPx ?? null
  const parentHeightPx = height?.parentPx ?? null
  const viewportHeightPx = height?.viewportPx ?? null
  const parentIsStack = width?.parentIsStack ?? height?.parentIsStack ?? null

  return (
    <div className='dimensions'>
      <div className='dimensions-header'>
        <h4 className='dimensions-header-title'>Size</h4>
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
          open={openAxes.width}
          onToggleOpen={() => toggleAxis('width')}
          parentPx={parentWidthPx}
          parentIsStack={parentIsStack}
        />
        <SizeAxis
          axis='height'
          leftLabel='H'
          main={linkedHeight}
          hasMinMax={Boolean(minHeight || maxHeight)}
          open={openAxes.height}
          onToggleOpen={() => toggleAxis('height')}
          parentPx={parentHeightPx}
          viewportPx={viewportHeightPx}
          parentIsStack={parentIsStack}
        />
      </div>
      {(widthOpen || heightOpen) && (
        <div className='size-axes'>
          <div className='size-axis-minmax'>
            {widthOpen && minWidth && (
              <MinMaxField label='MIN' field={minWidth} axis='width' parentPx={parentWidthPx} />
            )}
            {widthOpen && maxWidth && (
              <MinMaxField label='MAX' field={maxWidth} axis='width' parentPx={parentWidthPx} />
            )}
          </div>
          <div className='size-axis-minmax'>
            {heightOpen && minHeight && (
              <MinMaxField
                label='MIN'
                field={minHeight}
                axis='height'
                parentPx={parentHeightPx}
                viewportPx={viewportHeightPx}
              />
            )}
            {heightOpen && maxHeight && (
              <MinMaxField
                label='MAX'
                field={maxHeight}
                axis='height'
                parentPx={parentHeightPx}
                viewportPx={viewportHeightPx}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Horizontal chain-link — two link ends joined by a middle bar, laid out left-to-right.
 *  Same glyph whether locked or not; the locked state is conveyed by color (its button
 *  gets `.is-locked`), and unlocked dims to 0.55 to read as "off". */
function LinkIcon({locked}: {locked: boolean}) {
  return (
    <svg width='15' height='15' viewBox='0 0 15 15' fill='none' opacity={locked ? 1 : 0.55}>
      <path
        d='M6.3 5H4.6a2.5 2.5 0 0 0 0 5h1.7M8.7 5h1.7a2.5 2.5 0 0 1 0 5H8.7M5 7.5h5'
        stroke='currentColor'
        strokeWidth='1.3'
        strokeLinecap='round'
        strokeLinejoin='round'
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
  parentPx,
  viewportPx,
  parentIsStack,
}: {
  axis: 'width' | 'height'
  leftLabel: string
  main: FieldProps | null
  hasMinMax: boolean
  open: boolean
  onToggleOpen: () => void
  parentPx?: number | null
  viewportPx?: number | null
  parentIsStack?: boolean | null
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
          onClear={main.onClear}
          parentPx={parentPx}
          viewportPx={viewportPx}
          parentIsStack={parentIsStack}
        />
      </div>
    </div>
  )
}

function MinMaxField({
  label,
  field,
  axis,
  parentPx,
  viewportPx,
}: {
  label: string
  field: FieldProps
  axis: 'width' | 'height'
  parentPx?: number | null
  viewportPx?: number | null
}) {
  return (
    <div className={field.included ? 'size-axis-field is-included' : 'size-axis-field'}>
      <LengthField
        value={typeof field.value === 'string' ? field.value : null}
        axis={axis}
        constrained
        leftLabel={label}
        onChange={field.onChange}
        // Clearing a Min/Max field unsets it: in edit mode `field.onClear` also removes
        // it from the preset; in the live panel it just commits null.
        onClear={field.onClear ?? (() => field.onChange(null))}
        parentPx={parentPx}
        viewportPx={viewportPx}
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

/** Flow's segmented control, with the Wrap toggle as a separate small button at the end
 *  of the same row — visually distinct from the segmented control (its own background,
 *  4px gap) rather than one of its options, since Wrap isn't a Flow value. Only shown
 *  once the layer actually has a stack (Wrap doesn't apply to None/Grid). */
function FlowWrapRow({flow, wrap}: {flow: FieldProps; wrap: FieldProps | null}) {
  const showLabel = 'labelAbove' in flow.descriptor && flow.descriptor.labelAbove
  const wrapEnabled = Boolean(wrap?.value)
  return (
    <div className={flow.included ? 'property-fullwidth is-included' : 'property-fullwidth'}>
      {showLabel && <h4 className='property-fullwidth-label'>{flow.descriptor.label}</h4>}
      <div className='flow-wrap-row'>
        <div className='flow-wrap-row-control'>{renderControl(flow.descriptor, flow.value, flow.onChange)}</div>
        {wrap && (
          <button
            type='button'
            className={wrapEnabled ? 'flow-wrap-toggle is-active' : 'flow-wrap-toggle'}
            onClick={() => wrap.onChange(!wrapEnabled)}
            title={wrapEnabled ? 'Wrap: on' : 'Wrap: off'}
            aria-label={wrapEnabled ? 'Disable wrap' : 'Enable wrap'}
          >
            <WrapIcon />
          </button>
        )}
      </div>
    </div>
  )
}

/** Elevation (Z-Index) + Alignment grid side by side in one row. Elevation sits first
 *  (left) so it stays put when Alignment — which only exists for a stack — appears or
 *  disappears between selections. The alignment grid's two-page pager lives in its own
 *  header row, at the far right next to the "Alignment" title. */
function AlignmentZIndexRow({alignment, zIndex}: {alignment: FieldProps | null; zIndex: FieldProps | null}) {
  const [showAlternates, setShowAlternates] = useState(false)
  if (!alignment && !zIndex) return null
  return (
    <div className='alignment-zindex-row'>
      {zIndex && (
        <div className={zIndex.included ? 'zindex-block is-included' : 'zindex-block'}>
          <h4 className='property-fullwidth-label'>{zIndex.descriptor.label}</h4>
          {renderControl(zIndex.descriptor, zIndex.value, zIndex.onChange)}
        </div>
      )}
      {alignment && (
        <div className={alignment.included ? 'alignment-block is-included' : 'alignment-block'}>
          <div className='alignment-header'>
            <h4 className='property-fullwidth-label'>{alignment.descriptor.label}</h4>
            <AlignmentPager showAlternates={showAlternates} onChange={setShowAlternates} />
          </div>
          <AlignmentGrid
            value={alignment.value as AlignmentValue}
            onChange={alignment.onChange}
            showAlternates={showAlternates}
          />
        </div>
      )}
    </div>
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

/** Gap (fixed max-width) beside Padding (fills whatever's left) — see the comment where
 *  this is chosen over the generic equal-halves `PropertyFieldPair`. */
function GapPaddingRow({gap, padding}: {gap: FieldProps | null; padding: FieldProps | null}) {
  if (!gap && !padding) return null
  return (
    <div className='gap-padding-row'>
      {gap && (
        <div className='gap-padding-row-gap'>
          <PropertyMiniField {...gap} />
        </div>
      )}
      {padding && (
        <div className='gap-padding-row-padding'>
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
        // Flow's full-width segmented control, plus Wrap as a separate small button at
        // its end (rather than splitting the row into two equal-width fields, or
        // treating Wrap as one of Flow's own options).
        if (row.pair[0]?.descriptor.key === 'layout') {
          return row.pair[0] ? <FlowWrapRow key={index} flow={row.pair[0]} wrap={row.pair[1]} /> : null
        }
        // Gap gets a fixed max-width (108px) and Padding fills whatever's left, rather
        // than splitting the row into two equal halves like every other paired row —
        // Padding's own box (2-4 side fields) needs the room, Gap's compact one doesn't.
        if (row.pair[0]?.descriptor.key === 'gap' && row.pair[1]?.descriptor.key === 'padding') {
          return <GapPaddingRow key={index} gap={row.pair[0]} padding={row.pair[1]} />
        }
        // Alignment grid + Z-Index share one row. Detected on either half's key since a
        // non-stack node drops the alignment grid, leaving just Z-Index in the pair.
        const key0 = row.pair[0]?.descriptor.key
        const key1 = row.pair[1]?.descriptor.key
        if (key0 === 'stackAlignment' || key1 === 'zIndex' || key0 === 'zIndex') {
          const alignment = key0 === 'stackAlignment' ? row.pair[0] : null
          const zIndex = key1 === 'zIndex' ? row.pair[1] : key0 === 'zIndex' ? row.pair[0] : null
          return <AlignmentZIndexRow key={index} alignment={alignment} zIndex={zIndex} />
        }
        return <PropertyFieldPair key={index} left={row.pair[0]} right={row.pair[1]} />
      }
      return <PropertyColumnPair key={index} left={row.columns[0]} right={row.columns[1]} />
    })
}
