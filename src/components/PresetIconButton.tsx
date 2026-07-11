import type {AriaAttributes} from 'react'
import {PresetIcon, resolvePresetColor} from './presetAppearance'
import './PresetIconButton.css'

interface PresetIconButtonProps extends Pick<AriaAttributes, 'aria-haspopup' | 'aria-expanded'> {
  icon: string
  color: string
  size?: number
  onClick?: () => void
  title?: string
}

/** The square icon button standing in for a preset — used both in the sticky row atop
 *  the Style tab (large, ~69px) and beside the name field in the preset editor
 *  (small, as the trigger for PresetIconPicker). A faded-neon glow (a soft radial tint
 *  behind a near-black fill, matching the app's own accent language) rather than a
 *  flat saturated color, per each preset's own chosen hue. */
export function PresetIconButton({icon, color, size = 44, onClick, title, ...ariaProps}: PresetIconButtonProps) {
  const hex = resolvePresetColor(color)
  return (
    <button
      type='button'
      className='preset-icon-button'
      style={{
        width: size,
        height: size,
        color: hex,
        background: `radial-gradient(circle at 30% 25%, ${hex}3d, ${hex}14 60%, transparent)`,
        boxShadow: `inset 0 0 0 1px ${hex}33`,
      }}
      onClick={onClick}
      title={title}
      aria-label={title ?? 'Preset icon'}
      {...ariaProps}
    >
      <PresetIcon name={icon} />
    </button>
  )
}
