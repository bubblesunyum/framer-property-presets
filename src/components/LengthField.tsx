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

/** Width/height-style field: a numeric amount above a mode picker, matching Framer's
 *  own Size panel fields (a fixed pixel value, a percentage relative to the parent,
 *  hugging content, or filling available space via a flex fraction). The mode picker
 *  is an always-visible segmented control rather than a dropdown, so all its options
 *  are one click away instead of hidden behind an open/close step. */
export function LengthField({value, onChange, constrained}: LengthFieldProps) {
  const parsed = parseLength(value)

  return (
    <div className='length-field'>
      {parsed.mode !== 'fit-content' && (
        <NumberField
          value={parsed.amount}
          unit={parsed.mode}
          onChange={(amount) => onChange(serializeLength(parsed.mode, amount))}
        />
      )}
      <SegmentedControl
        value={parsed.mode}
        options={constrained ? CONSTRAINT_MODE_OPTIONS : SIZE_MODE_OPTIONS}
        onChange={(mode) => onChange(serializeLength(mode as LengthMode, parsed.amount))}
      />
    </div>
  )
}
