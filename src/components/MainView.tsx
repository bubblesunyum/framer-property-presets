import type {CanvasNode} from 'framer-plugin'
import {useEffect, useState} from 'react'
import {loadAllPresets} from '../storage/presetRepository'
import type {Preset} from '../types/preset'
import {DesignPanel} from './DesignPanel'
import './MainView.css'
import {PresetList} from './PresetList'
import {SegmentedControl} from './SegmentedControl'
import {StickyPresetRow} from './StickyPresetRow'

interface MainViewProps {
  selection: CanvasNode[]
  onRequestNew: () => void
  onRequestEdit: (preset: Preset) => void
}

const TABS = [
  {value: 'style', label: 'Style'},
  {value: 'presets', label: 'Presets'},
]

/** Top-level tabbed shell: Style is the live property editor for the current
 *  selection (with a sticky quick-apply preset row above it), Presets is the saved-
 *  preset list. Preset state lives here (not in PresetList) so both surfaces share one
 *  load and stay in sync with each other. */
export function MainView({selection, onRequestNew, onRequestEdit}: MainViewProps) {
  const [tab, setTab] = useState('style')
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
      <div className='main-view-tabs'>
        <SegmentedControl options={TABS} value={tab} onChange={setTab} />
      </div>
      <div className='main-view-content'>
        {tab === 'style' ? (
          <>
            <StickyPresetRow presets={presets} selection={selection} />
            <DesignPanel selection={selection} />
          </>
        ) : (
          <PresetList
            presets={presets}
            isLoading={isLoading}
            refreshToken={refreshToken}
            selection={selection}
            onRequestNew={onRequestNew}
            onRequestEdit={onRequestEdit}
            onMoved={handleMoved}
            onDeleted={handleDeleted}
          />
        )}
      </div>
    </main>
  )
}
