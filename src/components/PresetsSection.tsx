import type {CanvasNode} from 'framer-plugin'
import {useState} from 'react'
import {applyPresetToSelection} from '../canvas/applyPreset'
import type {Preset} from '../types/preset'
import {PresetList} from './PresetList'
import './PresetsSection.css'

interface PresetsSectionProps {
  presets: Preset[]
  isLoading: boolean
  refreshToken: number
  selection: CanvasNode[]
  onRequestNew: () => void
  onRequestEdit: (preset: Preset) => void
  onMoved: (updated: Preset) => void
  onDeleted: (id: string) => void
}

/** Sticky top section replacing the old Style/Presets tabs: a "Presets" header with a
 *  caret that expands a full preset list over the property panels below. Collapsed, it's
 *  a horizontal, scrollable strip of preset "pills" that quick-apply to the selection,
 *  with a pinned "+" (new preset) at the right edge and a gradient fade so the pills read
 *  as scrolling behind it. Expanded, the caret flips + fills in, and a column list grows
 *  down as an overlay (the panels underneath don't move — it covers them). */
export function PresetsSection({
  presets,
  isLoading,
  refreshToken,
  selection,
  onRequestNew,
  onRequestEdit,
  onMoved,
  onDeleted,
}: PresetsSectionProps) {
  const [expanded, setExpanded] = useState(false)

  const apply = (preset: Preset) => {
    if (selection.length === 0) return
    void applyPresetToSelection(preset, selection)
  }

  return (
    <div className={expanded ? 'presets-section is-expanded' : 'presets-section'}>
      <div className='presets-header'>
        <h3 className='presets-header-title'>Presets</h3>
        <button
          type='button'
          className={expanded ? 'presets-caret is-expanded' : 'presets-caret'}
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse presets' : 'Expand presets'}
        >
          <CaretDownIcon />
        </button>
      </div>

      {/* The pill strip and the expand overlay share this relative box: the overlay is
          absolute from its top edge, so when open it covers the pill strip (and grows
          down over the panels below) while the strip stays in flow — nothing beneath the
          section moves. */}
      <div className='presets-body'>
        {presets.length > 0 && (
          <div className='presets-collapsed'>
            <div className='presets-pills framer-hide-scrollbar'>
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type='button'
                  className='preset-pill'
                  onClick={() => apply(preset)}
                  title={`Apply "${preset.name}"`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
            {/* Fade + pinned add, so the pill strip appears to scroll behind the "+". */}
            <div className='presets-fade' />
            <button
              type='button'
              className='preset-pill preset-pill-add'
              onClick={onRequestNew}
              disabled={selection.length === 0}
              title='New preset'
              aria-label='New preset'
            >
              +
            </button>
          </div>
        )}

        {/* Always in the DOM so it can animate open; max-height keeps it collapsed to
            nothing until expanded. */}
        <div className='presets-overlay'>
          <PresetList
            presets={presets}
            isLoading={isLoading}
            refreshToken={refreshToken}
            selection={selection}
            onRequestNew={onRequestNew}
            onRequestEdit={onRequestEdit}
            onMoved={onMoved}
            onDeleted={onDeleted}
          />
        </div>
      </div>
    </div>
  )
}

function CaretDownIcon() {
  return (
    <svg width='9' height='9' viewBox='0 0 9 9' fill='none'>
      <path d='M2 3.5l2.5 2.5 2.5-2.5' stroke='currentColor' strokeWidth='1.3' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  )
}
