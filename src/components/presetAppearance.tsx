/** The 6 "common" colors offered as one-click swatches — a faded-neon palette matching
 *  this app's own accent language (see App.css's --framer-color-tint) rather than
 *  primary-color basics. The color map (PresetIconPicker) can still produce any other
 *  hex value on top of these; `color` on a Preset is just a CSS color string, named or
 *  not. */
export const PRESET_COLORS: {name: string; hex: string}[] = [
  {name: 'violet', hex: '#8b5cf6'},
  {name: 'blue', hex: '#3b9eff'},
  {name: 'teal', hex: '#2dd4bf'},
  {name: 'green', hex: '#4ade80'},
  {name: 'amber', hex: '#fbbf24'},
  {name: 'rose', hex: '#fb7185'},
]

/** Resolves a Preset's stored `color` (a named swatch above, or an arbitrary hex string
 *  from the color map) to a real CSS color — named colors aren't valid CSS on their
 *  own, so this is the one place that has to know both representations. */
export function resolvePresetColor(color: string): string {
  return PRESET_COLORS.find((c) => c.name === color)?.hex ?? color
}

/** Design/layout/spatial icon set for telling small preset buttons apart at a glance —
 *  intentionally generic shapes (not literal "this preset does X" icons), since a
 *  preset's actual meaning is user-defined. */
export const PRESET_ICONS = [
  'square',
  'circle',
  'triangle',
  'hexagon',
  'star',
  'diamond',
  'grid',
  'columns',
  'rows',
  'layers',
  'frame',
  'align',
  'component',
  'bookmark',
  'tag',
  'bolt',
] as const

export type PresetIconName = (typeof PRESET_ICONS)[number]

export function PresetIcon({name}: {name: string}) {
  const props = {width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none'} as const
  switch (name as PresetIconName) {
    case 'circle':
      return (
        <svg {...props}>
          <circle cx='9' cy='9' r='6.5' stroke='currentColor' strokeWidth='1.4' />
        </svg>
      )
    case 'triangle':
      return (
        <svg {...props}>
          <path d='M9 2.5 16 15H2L9 2.5z' stroke='currentColor' strokeWidth='1.4' strokeLinejoin='round' />
        </svg>
      )
    case 'hexagon':
      return (
        <svg {...props}>
          <path d='M9 2 15.5 5.75V12.25L9 16 2.5 12.25V5.75L9 2z' stroke='currentColor' strokeWidth='1.4' strokeLinejoin='round' />
        </svg>
      )
    case 'star':
      return (
        <svg {...props}>
          <path
            d='M9 2.3 10.9 6.9 15.8 7.3 12.1 10.5 13.2 15.3 9 12.7 4.8 15.3 5.9 10.5 2.2 7.3 7.1 6.9 9 2.3z'
            stroke='currentColor'
            strokeWidth='1.3'
            strokeLinejoin='round'
          />
        </svg>
      )
    case 'diamond':
      return (
        <svg {...props}>
          <path d='M9 2.5 15.5 9 9 15.5 2.5 9 9 2.5z' stroke='currentColor' strokeWidth='1.4' strokeLinejoin='round' />
        </svg>
      )
    case 'grid':
      return (
        <svg {...props}>
          <rect x='2.5' y='2.5' width='5.2' height='5.2' rx='1' stroke='currentColor' strokeWidth='1.3' />
          <rect x='10.3' y='2.5' width='5.2' height='5.2' rx='1' stroke='currentColor' strokeWidth='1.3' />
          <rect x='2.5' y='10.3' width='5.2' height='5.2' rx='1' stroke='currentColor' strokeWidth='1.3' />
          <rect x='10.3' y='10.3' width='5.2' height='5.2' rx='1' stroke='currentColor' strokeWidth='1.3' />
        </svg>
      )
    case 'columns':
      return (
        <svg {...props}>
          <rect x='2.5' y='2.5' width='4.5' height='13' rx='1' stroke='currentColor' strokeWidth='1.3' />
          <rect x='9.75' y='2.5' width='4.5' height='13' rx='1' stroke='currentColor' strokeWidth='1.3' />
        </svg>
      )
    case 'rows':
      return (
        <svg {...props}>
          <rect x='2.5' y='2.5' width='13' height='4.5' rx='1' stroke='currentColor' strokeWidth='1.3' />
          <rect x='2.5' y='9.75' width='13' height='4.5' rx='1' stroke='currentColor' strokeWidth='1.3' />
        </svg>
      )
    case 'layers':
      return (
        <svg {...props}>
          <path d='M9 2.5 15.5 6 9 9.5 2.5 6 9 2.5z' stroke='currentColor' strokeWidth='1.3' strokeLinejoin='round' />
          <path d='M2.5 9.5 9 13l6.5-3.5' stroke='currentColor' strokeWidth='1.3' strokeLinecap='round' strokeLinejoin='round' opacity='0.6' />
          <path d='M2.5 12.8 9 16.3l6.5-3.5' stroke='currentColor' strokeWidth='1.3' strokeLinecap='round' strokeLinejoin='round' opacity='0.35' />
        </svg>
      )
    case 'frame':
      return (
        <svg {...props}>
          <path
            d='M5 1.5v15M13 1.5v15M1.5 5h15M1.5 13h15'
            stroke='currentColor'
            strokeWidth='1.3'
            strokeLinecap='round'
          />
        </svg>
      )
    case 'align':
      return (
        <svg {...props}>
          <path d='M9 2v14' stroke='currentColor' strokeWidth='1.3' strokeLinecap='round' opacity='0.5' />
          <rect x='4' y='4.5' width='10' height='3' rx='1' stroke='currentColor' strokeWidth='1.3' />
          <rect x='6' y='10.5' width='6' height='3' rx='1' stroke='currentColor' strokeWidth='1.3' />
        </svg>
      )
    case 'component':
      return (
        <svg {...props}>
          <path
            d='M9 2 11.5 4.5 9 7 6.5 4.5 9 2zM13.5 6.5 16 9l-2.5 2.5L11 9l2.5-2.5zM4.5 6.5 7 9l-2.5 2.5L2 9l2.5-2.5zM9 11l2.5 2.5L9 16l-2.5-2.5L9 11z'
            stroke='currentColor'
            strokeWidth='1.2'
            strokeLinejoin='round'
          />
        </svg>
      )
    case 'bookmark':
      return (
        <svg {...props}>
          <path d='M4.5 2.5h9v13l-4.5-3-4.5 3v-13z' stroke='currentColor' strokeWidth='1.3' strokeLinejoin='round' />
        </svg>
      )
    case 'tag':
      return (
        <svg {...props}>
          <path
            d='M2.5 2.5h6l7 7-6 6-7-7v-6z'
            stroke='currentColor'
            strokeWidth='1.3'
            strokeLinejoin='round'
          />
          <circle cx='6' cy='6' r='1.1' fill='currentColor' />
        </svg>
      )
    case 'bolt':
      return (
        <svg {...props}>
          <path d='M10 2 4 10h4l-1 6 7-8h-4l1-6z' stroke='currentColor' strokeWidth='1.3' strokeLinejoin='round' />
        </svg>
      )
    case 'square':
    default:
      return (
        <svg {...props}>
          <rect x='2.5' y='2.5' width='13' height='13' rx='2' stroke='currentColor' strokeWidth='1.4' />
        </svg>
      )
  }
}
