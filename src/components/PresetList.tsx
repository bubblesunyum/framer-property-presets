import type {CanvasNode} from 'framer-plugin'
import {useEffect, useState} from 'react'
import {loadAllPresets} from '../storage/presetRepository'
import type {Preset} from '../types/preset'
import './PresetList.css'
import {PresetListItem} from './PresetListItem'

interface PresetListProps {
  selection: CanvasNode[]
  onRequestNew: () => void
  onRequestEdit: (preset: Preset) => void
}

function PlusIcon() {
  return (
    <svg width='12' height='12' viewBox='0 0 12 12' fill='none'>
      <path d='M6 1v10M1 6h10' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' />
    </svg>
  )
}

export function PresetList({selection, onRequestNew, onRequestEdit}: PresetListProps) {
  const [presets, setPresets] = useState<Preset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    let active = true
    void loadAllPresets().then((loaded) => {
      if (!active) return
      setPresets(loaded)
      setIsLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const handleMoved = (updated: Preset) => {
    setPresets((prev) => prev.map((preset) => (preset.id === updated.id ? updated : preset)))
    setRefreshToken((token) => token + 1)
  }

  const handleDeleted = (id: string) => {
    setPresets((prev) => prev.filter((preset) => preset.id !== id))
    setRefreshToken((token) => token + 1)
  }

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
          <div className='preset-list-empty'>
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
              onMoved={handleMoved}
              onDeleted={handleDeleted}
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
