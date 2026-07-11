import type {CanvasNode} from 'framer-plugin'
import type {Preset} from '../types/preset'
import './PresetList.css'
import {PresetListItem} from './PresetListItem'

interface PresetListProps {
  presets: Preset[]
  isLoading: boolean
  refreshToken: number
  selection: CanvasNode[]
  onRequestNew: () => void
  onRequestEdit: (preset: Preset) => void
  onMoved: (updated: Preset) => void
  onDeleted: (id: string) => void
}

function PlusIcon() {
  return (
    <svg width='12' height='12' viewBox='0 0 12 12' fill='none'>
      <path d='M6 1v10M1 6h10' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' />
    </svg>
  )
}

export function PresetList({
  presets,
  isLoading,
  refreshToken,
  selection,
  onRequestNew,
  onRequestEdit,
  onMoved,
  onDeleted,
}: PresetListProps) {
  const newDisabled = selection.length === 0
  const newButton = (
    <button
      type='button'
      className='framer-button-primary preset-new-button'
      disabled={newDisabled}
      onClick={onRequestNew}
    >
      <PlusIcon />
      New Preset
    </button>
  )

  return (
    <main className='preset-list'>
      <div className='preset-list-body framer-hide-scrollbar'>
        {isLoading ? (
          <div className='preset-list-empty' role='status' aria-label='Loading presets'>
            <div className='framer-spinner' />
          </div>
        ) : presets.length === 0 ? (
          <div className='preset-list-empty'>
            <p>No presets yet. Select a frame and save one to get started.</p>
          </div>
        ) : (
          presets.map((preset) => (
            <PresetListItem
              key={preset.id}
              preset={preset}
              selection={selection}
              refreshToken={refreshToken}
              onMoved={onMoved}
              onDeleted={onDeleted}
              onEdit={onRequestEdit}
            />
          ))
        )}
      </div>
      {/* Sticky footer floats over the scrolling list; the body reserves bottom padding
          so the last row is never hidden behind it. */}
      <div className='preset-list-footer'>{newButton}</div>
    </main>
  )
}
