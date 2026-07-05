import {Dropdown, type DropdownOption} from './Dropdown'
import {NumberField} from './NumberField'
import './LengthField.css'

type LengthMode = 'px' | '%' | 'fit-content' | 'fr'

interface LengthFieldProps {
  value: string | null
  onChange: (value: string) => void
}

const MODE_OPTIONS: DropdownOption[] = [
  {value: 'px', label: 'Fixed', shortLabel: 'Fix'},
  {value: '%', label: 'Relative', shortLabel: 'Rel'},
  {value: 'fit-content', label: 'Fit Content', shortLabel: 'Fit'},
  {value: 'fr', label: 'Fill'},
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

/** Width/height-style field: a numeric amount plus a sizing mode, matching Framer's
 *  own Size panel fields (a fixed pixel value, a percentage relative to the parent,
 *  hugging content, or filling available space via a flex fraction). NumberField
 *  already buffers input and shows a unit suffix, so the amount always reads with
 *  its mode attached (e.g. "50%", "375px", "1fr") instead of a bare, ambiguous
 *  number. */
export function LengthField({value, onChange}: LengthFieldProps) {
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
      <div className='length-field-mode'>
        <Dropdown
          value={parsed.mode}
          options={MODE_OPTIONS}
          onChange={(mode) => onChange(serializeLength((mode as LengthMode) ?? 'px', parsed.amount))}
        />
      </div>
    </div>
  )
}
