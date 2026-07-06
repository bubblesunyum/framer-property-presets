import type {CanvasNode} from 'framer-plugin'
import {useState} from 'react'
import {MainView} from './components/MainView'
import {PresetEditor} from './components/PresetEditor'
import {useSelection} from './hooks/useSelection'
import type {Preset} from './types/preset'

type Screen =
  | {kind: 'main'}
  | {kind: 'create'; node: CanvasNode; selectionCount: number}
  | {kind: 'edit'; preset: Preset}

export function App() {
  const selection = useSelection()
  const [screen, setScreen] = useState<Screen>({kind: 'main'})

  if (screen.kind === 'create') {
    return (
      <PresetEditor
        mode='create'
        node={screen.node}
        selectionCount={screen.selectionCount}
        onSaved={() => setScreen({kind: 'main'})}
        onCancel={() => setScreen({kind: 'main'})}
      />
    )
  }

  if (screen.kind === 'edit') {
    return (
      <PresetEditor
        mode='edit'
        preset={screen.preset}
        onSaved={() => setScreen({kind: 'main'})}
        onCancel={() => setScreen({kind: 'main'})}
      />
    )
  }

  return (
    <MainView
      selection={selection}
      onRequestNew={() => {
        const [primary] = selection
        if (!primary) return
        setScreen({kind: 'create', node: primary, selectionCount: selection.length})
      }}
      onRequestEdit={(preset) => setScreen({kind: 'edit', preset})}
    />
  )
}
