import {useEffect, useRef, useState} from 'react'
import {createPortal} from 'react-dom'
import {PresetIcon, PRESET_COLORS, PRESET_ICONS} from './presetAppearance'
import {PresetIconButton} from './PresetIconButton'
import './PresetIconPicker.css'

interface PresetIconPickerProps {
  icon: string
  color: string
  onChange: (next: {icon: string; color: string}) => void
}

const COMMON_ICON_COUNT = 6

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const value = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * value)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/** Small square trigger (see PresetIconButton) that opens a portaled popout to
 *  customize a preset's icon + color: 6 one-click color swatches, a clickable
 *  hue/lightness map for anything else, 6 common icons, and an expandable grid for the
 *  rest. Same portal/position/outside-click pattern as Dropdown.tsx. */
export function PresetIconPicker({icon, color, onChange}: PresetIconPickerProps) {
  const [position, setPosition] = useState<{top: number; left: number} | null>(null)
  const [showAllIcons, setShowAllIcons] = useState(false)
  // A virtual cursor for keyboard use — the colormap's actual value (`color`) is an
  // opaque string (a named swatch or an arbitrary hex from a previous pick), so there's
  // no way to recover "where in the square" it came from to continue nudging from there.
  // Resets to a sensible starting point each time the popover opens instead.
  const [mapCursor, setMapCursor] = useState({hue: 0, lightness: 0.5})
  const triggerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<HTMLDivElement>(null)

  const isOpen = position !== null
  const close = () => setPosition(null)
  const open = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    setPosition({top: rect.bottom + 6, left: rect.left})
  }

  // Move focus into the popover when it opens, so keyboard users land on an actionable
  // control (matches Dropdown/PresetMenu's pattern).
  useEffect(() => {
    if (!isOpen) return
    setMapCursor({hue: 0, lightness: 0.5})
    popoverRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (popoverRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      close()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
        triggerRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
      }
    }
    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const pickFromMap = (event: React.MouseEvent) => {
    const rect = mapRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width)
    const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height)
    const hue = (x / rect.width) * 360
    const yFrac = y / rect.height
    const lightness = yFrac < 0.5 ? 1 - yFrac : 0.5 - (yFrac - 0.5)
    onChange({icon, color: hslToHex(hue, 1, lightness)})
  }

  // Keyboard equivalent of dragging a point around the map — left/right steps hue
  // around the wheel, up/down steps lightness from black to white. There's no on-screen
  // cursor to keep visually in sync with (the map has no crosshair indicator at all,
  // for mouse use either), so this uses a plain monotonic lightness rather than
  // replicating pickFromMap's inverted-V curve (which only exists to make the *visual*
  // gradient read as two stacked halves) — simpler, and just as reachable a color space.
  const nudgeMap = (event: React.KeyboardEvent) => {
    let {hue, lightness} = mapCursor
    if (event.key === 'ArrowLeft') hue = (hue - 15 + 360) % 360
    else if (event.key === 'ArrowRight') hue = (hue + 15) % 360
    else if (event.key === 'ArrowUp') lightness = Math.min(1, lightness + 0.05)
    else if (event.key === 'ArrowDown') lightness = Math.max(0, lightness - 0.05)
    else return
    event.preventDefault()
    setMapCursor({hue, lightness})
    onChange({icon, color: hslToHex(hue, 1, lightness)})
  }

  const commonIcons = PRESET_ICONS.slice(0, COMMON_ICON_COUNT)
  const restIcons = PRESET_ICONS.slice(COMMON_ICON_COUNT)

  return (
    <div ref={triggerRef} className='preset-icon-picker-trigger'>
      <PresetIconButton
        icon={icon}
        color={color}
        size={36}
        onClick={() => (isOpen ? close() : open())}
        title='Customize icon'
        aria-haspopup='dialog'
        aria-expanded={isOpen}
      />
      {position &&
        createPortal(
          <div ref={popoverRef} className='preset-icon-picker' style={{top: position.top, left: position.left}}>
            <p className='preset-icon-picker-label'>Color</p>
            <div className='preset-icon-picker-swatches'>
              {PRESET_COLORS.map((swatch) => (
                <button
                  key={swatch.name}
                  type='button'
                  className={color === swatch.name ? 'preset-color-swatch is-active' : 'preset-color-swatch'}
                  style={{background: swatch.hex}}
                  onClick={() => onChange({icon, color: swatch.name})}
                  aria-label={swatch.name}
                  title={swatch.name}
                />
              ))}
            </div>
            <div
              ref={mapRef}
              className='preset-icon-picker-colormap'
              onClick={pickFromMap}
              onKeyDown={nudgeMap}
              role='slider'
              tabIndex={0}
              aria-label='Custom color'
              aria-valuetext={`Hue ${Math.round(mapCursor.hue)}, lightness ${Math.round(mapCursor.lightness * 100)}%`}
            />

            <p className='preset-icon-picker-label'>Icon</p>
            <div className='preset-icon-picker-icons'>
              {commonIcons.map((name) => (
                <button
                  key={name}
                  type='button'
                  className={icon === name ? 'preset-icon-swatch is-active' : 'preset-icon-swatch'}
                  onClick={() => onChange({icon: name, color})}
                  aria-label={name}
                  title={name}
                >
                  <PresetIcon name={name} />
                </button>
              ))}
            </div>
            <button
              type='button'
              className={showAllIcons ? 'preset-icon-picker-expand is-open' : 'preset-icon-picker-expand'}
              onClick={() => setShowAllIcons((prev) => !prev)}
              aria-label={showAllIcons ? 'Show fewer icons' : 'Show more icons'}
            >
              <ExpandCaret />
            </button>
            {showAllIcons && (
              <div className='preset-icon-picker-icons'>
                {restIcons.map((name) => (
                  <button
                    key={name}
                    type='button'
                    className={icon === name ? 'preset-icon-swatch is-active' : 'preset-icon-swatch'}
                    onClick={() => onChange({icon: name, color})}
                    aria-label={name}
                    title={name}
                  >
                    <PresetIcon name={name} />
                  </button>
                ))}
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}

function ExpandCaret() {
  return (
    <svg width='9' height='6' viewBox='0 0 9 6' fill='none'>
      <path d='M1 1l3.5 3.5L8 1' stroke='currentColor' strokeWidth='1.3' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  )
}
