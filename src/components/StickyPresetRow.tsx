import type {CanvasNode} from 'framer-plugin'
import {useState} from 'react'
import {applyPresetToSelection} from '../canvas/applyPreset'
import type {Preset} from '../types/preset'
import './StickyPresetRow.css'
import {PresetIconButton} from './PresetIconButton'

interface StickyPresetRowProps {
  presets: Preset[]
  selection: CanvasNode[]
}

interface TooltipState {
  name: string
  x: number
  y: number
}

/** Sticky strip atop the Style tab: one square icon button per saved preset, for
 *  quick-applying a preset to the current selection without switching to the Presets
 *  tab. Purely a shortcut — editing a preset's icon/color still happens in the preset
 *  editor (see PresetIconPicker). The hovered preset's name shows in a small fixed-
 *  position tooltip (fixed so the row's own horizontal scroll clipping can't cut it
 *  off; pointer-events: none so it never blocks the click it's describing). */
export function StickyPresetRow({presets, selection}: StickyPresetRowProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  if (presets.length === 0) return null

  return (
    <div className='sticky-preset-row framer-hide-scrollbar'>
      {presets.map((preset) => (
        <div
          key={preset.id}
          className='sticky-preset-item'
          onMouseEnter={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            setTooltip({name: preset.name, x: rect.left + rect.width / 2, y: rect.bottom + 4})
          }}
          onMouseLeave={() => setTooltip(null)}
        >
          <PresetIconButton
            icon={preset.icon}
            color={preset.color}
            size={35}
            onClick={() => {
              if (selection.length === 0) return
              void applyPresetToSelection(preset, selection)
            }}
          />
        </div>
      ))}
      {tooltip && (
        <div className='sticky-preset-tooltip' style={{left: tooltip.x, top: tooltip.y}}>
          {tooltip.name}
        </div>
      )}
    </div>
  )
}
