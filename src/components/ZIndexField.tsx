import {NumberField} from './NumberField'
import './ZIndexField.css'

interface ZIndexFieldProps {
  value: number | null
  onChange: (value: number) => void
}

const RECT_COUNT = 3

/** Z-Index as a vertical stack of six rounded rectangles (bottom = 0, top = 5), with the
 *  editable number field beneath them. Exactly one rectangle highlights — the one whose
 *  index matches the current value — and none highlight when the value falls outside
 *  0–5, since the stack only represents that common near-front range (the field itself
 *  still holds and edits any integer). */
export function ZIndexField({value, onChange}: ZIndexFieldProps) {
  return (
    <div className='zindex-field'>
      <div className='zindex-stack'>
        {/* Rendered top-to-bottom, so the highest index is first in the DOM and 0
                    lands at the bottom, matching how a stacking order reads visually. */}
        {Array.from({length: RECT_COUNT}, (_, i) => {
          const rectValue = RECT_COUNT - 1 - i
          const isSelected = value === rectValue || (value === null && rectValue === 0)
          return (
            <button
              key={rectValue}
              type='button'
              className={isSelected ? 'zindex-rect is-selected' : 'zindex-rect'}
              onClick={() => onChange(rectValue)}
              title={`Z-Index ${rectValue}`}
              aria-label={`Set z-index to ${rectValue}`}
              aria-pressed={isSelected}
            />
          )
        })}
      </div>
      <NumberField value={value ?? 0} onChange={onChange} dim={value == null} compact hugContent />
    </div>
  )
}
