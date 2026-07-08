import type {CanvasNode} from 'framer-plugin'
import {useEffect, useState} from 'react'
import {loadAllPresets} from '../storage/presetRepository'
import type {Preset} from '../types/preset'
import {DesignPanel} from './DesignPanel'
import './MainView.css'
import {PresetsSection} from './PresetsSection'

interface MainViewProps {
  selection: CanvasNode[]
  onRequestNew: () => void
  onRequestEdit: (preset: Preset) => void
}

/** Single-surface shell (no Style/Presets tabs anymore): a sticky "Presets" section at
 *  the top — a scrollable strip of quick-apply pills that expands into the full list —
 *  over the always-visible live property editor for the current selection. Preset state
 *  lives here so the pill strip and the expanded list share one load and stay in sync. */
export function MainView({selection, onRequestNew, onRequestEdit}: MainViewProps) {
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
    // Re-run whenever a preset is created/edited/moved/deleted elsewhere in this view.
  }, [refreshToken])

  const bumpRefresh = () => setRefreshToken((token) => token + 1)
  const handleMoved = (updated: Preset) => {
    setPresets((prev) => prev.map((preset) => (preset.id === updated.id ? updated : preset)))
    bumpRefresh()
  }
  const handleDeleted = (id: string) => {
    setPresets((prev) => prev.filter((preset) => preset.id !== id))
    bumpRefresh()
  }

  return (
    <main className='main-view'>
      <PresetsSection
        presets={presets}
        isLoading={isLoading}
        refreshToken={refreshToken}
        selection={selection}
        onRequestNew={onRequestNew}
        onRequestEdit={onRequestEdit}
        onMoved={handleMoved}
        onDeleted={handleDeleted}
      />
      <div className='main-view-content'>
        <DesignPanel selection={selection} />
      </div>
    </main>
  )
}
