import {NumberField} from './NumberField'
import {SegmentedControl} from './SegmentedControl'
import './LengthField.css'

type LengthMode = 'px' | '%' | 'fit-content' | 'fr'

interface LengthFieldProps {
  value: string | null
  onChange: (value: string) => void
  /** Restricts the mode picker to px/% — for Min/Max constraint fields, which (unlike
   *  Width/Height) can never be "Fill" or "Fit Content" — see SizeLengthDescriptor. */
  constrained?: boolean
}

const SIZE_MODE_OPTIONS = [
  {value: 'fr', label: 'Fill'},
  {value: 'fit-content', label: 'Fit'},
  {value: '%', label: '%'},
  {value: 'px', label: 'px'},
]

const CONSTRAINT_MODE_OPTIONS = [
  {value: '%', label: '%'},
  {value: 'px', label: 'px'},
]

function parseLength(raw: string | null): {mode: LengthMode; amount: number | null} {
  if (raw === 'fit-content' || raw === 'fit-image') return {mode: 'fit-content', amount: null}
  if (typeof raw === 'string') {
    const match = /^(-?\d*\.?\d+)(px|%|fr)$/.exec(raw)
    if (match) return {mode: match[2] as LengthMode, amount: Number(match[1])}
  }
  return {mode: 'px', amount: null}
}

function serializeLength(mode: LengthMode, amount: number | null): string {
  if (mode === 'fit-content') return 'fit-content'
  return `${amount ?? (mode === 'fr' ? 1 : 0)}${mode}`
}

/** Width/height-style field: one connected control with the numeric value on top,
 *  a thin divider, and the mode picker (Fill / Fit / % / px) below — matching Framer's
 *  own Size field, where the value and its unit read together ("375px") and every mode
 *  is one click away. "Fit" has no numeric value, so the value row (and divider) drop
 *  out for it, leaving just the picker. */
export function LengthField({value, onChange, constrained}: LengthFieldProps) {
  const parsed = parseLength(value)
  const hasValue = parsed.mode !== 'fit-content'

  return (
    <div className='length-field'>
      {hasValue && (
        <div className='length-field-value'>
          <NumberField
            value={parsed.amount}
            unit={parsed.mode}
            inlineUnit
            onChange={(amount) => onChange(serializeLength(parsed.mode, amount))}
          />
        </div>
      )}
      {hasValue && <div className='length-field-divider' />}
      <SegmentedControl
        value={parsed.mode}
        options={constrained ? CONSTRAINT_MODE_OPTIONS : SIZE_MODE_OPTIONS}
        onChange={(mode) => onChange(serializeLength(mode as LengthMode, parsed.amount))}
      />
    </div>
  )
}
