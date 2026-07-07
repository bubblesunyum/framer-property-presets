import {NumberField} from './NumberField'
import {SegmentedControl} from './SegmentedControl'
import './LengthField.css'

type LengthMode = 'px' | '%' | 'fit-content' | 'fr'

interface LengthFieldProps {
  value: string | null
  onChange: (value: string) => void
  /** Min/Max constraints can never be "Fill" or "Fit Content" (the SDK's
   *  WidthConstraint/HeightConstraint types have no fit-content/fr variant) — those two
   *  options stay visible but disabled/grayed rather than disappearing, so the control
   *  always shows the same 4 options everywhere. */
  constrained?: boolean
  /** The node's actual rendered pixel size — shown, disabled, in place of a real value
   *  while mode is "Fit" (which has no numeric value of its own). Only ever populated
   *  where there's a live node to measure (create mode / the Design panel); absent in
   *  edit mode, where the field just shows an empty dash instead. */
  computedPx?: number | null
}

const SIZE_MODE_OPTIONS = [
  {value: 'fr', label: 'Fill'},
  {value: 'fit-content', label: 'Fit'},
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
 *  is one click away. "Fit" has no numeric value of its own, so its row shows the
 *  node's actual rendered size instead, disabled (not removed) rather than disappearing. */
export function LengthField({value, onChange, constrained, computedPx}: LengthFieldProps) {
  const parsed = parseLength(value)
  const isFit = parsed.mode === 'fit-content'

  const setMode = (mode: LengthMode) => {
    // A Fill value is a flex ratio, not a length — carrying over whatever number the
    // field last held in px/% mode would read as a nonsensical flex ratio, so it always
    // resets to 1 rather than keeping the old amount.
    onChange(serializeLength(mode, mode === 'fr' ? 1 : parsed.amount))
  }

  return (
    <div className='length-field'>
      <div className='length-field-value'>
        <NumberField
          value={isFit ? (computedPx ?? null) : parsed.amount}
          unit={isFit ? 'px' : parsed.mode}
          disabled={isFit}
          dim={!isFit && parsed.amount == null}
          compact
          showCarets
          onChange={(amount) => onChange(serializeLength(parsed.mode, amount))}
        />
      </div>
      <div className='length-field-divider' />
      <SegmentedControl
        value={parsed.mode}
        options={SIZE_MODE_OPTIONS.map((option) => ({
          ...option,
          disabled: constrained && (option.value === 'fr' || option.value === 'fit-content'),
        }))}
        onChange={(mode) => setMode(mode as LengthMode)}
      />
    </div>
  )
}
