import type {CanvasNode} from 'framer-plugin'
import {applyPresetToSelection} from '../canvas/applyPreset'
import type {Preset} from '../types/preset'
import './StickyPresetRow.css'
import {PresetIconButton} from './PresetIconButton'

interface StickyPresetRowProps {
  presets: Preset[]
  selection: CanvasNode[]
}

/** Sticky strip atop the Style tab: one square icon button per saved preset, for
 *  quick-applying a preset to the current selection without switching to the Presets
 *  tab. Purely a shortcut — editing a preset's icon/color still happens in the preset
 *  editor (see PresetIconPicker). */
export function StickyPresetRow({presets, selection}: StickyPresetRowProps) {
  if (presets.length === 0) return null

  return (
    <div className='sticky-preset-row framer-hide-scrollbar'>
      {presets.map((preset) => (
        <PresetIconButton
          key={preset.id}
          icon={preset.icon}
          color={preset.color}
          size={69}
          title={`Apply "${preset.name}"`}
          onClick={() => {
            if (selection.length === 0) return
            void applyPresetToSelection(preset, selection)
          }}
        />
      ))}
    </div>
  )
}
