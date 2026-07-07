import type {CanvasNode} from 'framer-plugin'
import {useState} from 'react'
import type {Preset} from '../types/preset'
import {DesignPanel} from './DesignPanel'
import './MainView.css'
import {PresetList} from './PresetList'
import {SegmentedControl} from './SegmentedControl'

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
 *  selection, Presets is the saved-preset list. */
export function MainView({selection, onRequestNew, onRequestEdit}: MainViewProps) {
  const [tab, setTab] = useState('style')

  return (
    <main className='main-view'>
      <div className='main-view-tabs'>
        <SegmentedControl options={TABS} value={tab} onChange={setTab} />
      </div>
      <div className='main-view-content'>
        {tab === 'style' ? (
          <DesignPanel selection={selection} />
        ) : (
          <PresetList selection={selection} onRequestNew={onRequestNew} onRequestEdit={onRequestEdit} />
        )}
      </div>
    </main>
  )
}
