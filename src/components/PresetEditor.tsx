import {supportsName, type CanvasNode} from 'framer-plugin'
import {useEffect, useState} from 'react'
import {captureFromNode} from '../canvas/capturePreset'
import {useBufferedInput} from '../hooks/useBufferedInput'
import {notify, notifyThrottled} from '../lib/notify'
import {isExplicitValue} from '../schema/propertySchema'
import {createPreset, updatePreset} from '../storage/presetRepository'
import {
  finalizePreset,
  DEFAULT_PRESET_APPEARANCE,
  type DraftPreset,
  type Preset,
  type PresetProperties,
  type PresetPropertyKey,
} from '../types/preset'
import {buildFieldProps, withDefaults} from './fieldProps'
import './PresetEditor.css'
import {PresetIconPicker} from './PresetIconPicker'
import {PropertySections} from './PropertySections'

export type PresetEditorProps =
  | {mode: 'create'; node: CanvasNode; selectionCount: number; onSaved: () => void; onCancel: () => void}
  | {mode: 'edit'; preset: Preset; onSaved: () => void; onCancel: () => void}

type SaveState = {kind: 'idle' | 'saving'} | {kind: 'error' | 'note'; message: string}

function computeInitiallyIncluded(properties: DraftPreset['properties']): Set<PresetPropertyKey> {
  const included = new Set<PresetPropertyKey>()
  for (const key of Object.keys(properties) as PresetPropertyKey[]) {
    if (isExplicitValue(key, properties[key])) included.add(key)
  }
  return included
}

interface PresetNameFieldProps {
  value: string
  onChange: (value: string) => void
}

/** Buffered so typing only commits (and re-renders the whole property list below) on
 *  blur/Enter instead of on every keystroke — see useBufferedInput. */
function PresetNameField({value, onChange}: PresetNameFieldProps) {
  const [pending, setPending, commit] = useBufferedInput(value, onChange)

  return (
    <input
      type='text'
      className='preset-editor-name'
      placeholder='Preset name'
      value={pending}
      onChange={(event) => setPending(event.currentTarget.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit()
      }}
      autoComplete='off'
      autoCorrect='off'
      spellCheck={false}
      data-lpignore='true'
      data-1p-ignore='true'
      data-gramm='false'
      data-gramm_editor='false'
    />
  )
}

/** Same screen for capturing a brand-new preset from a canvas node and for editing an
 *  already-saved one. The two modes differ only in how the draft is seeded and how a
 *  field's "included" state is decided:
 *  - create: seeded from a live node; a field starts active if its captured value
 *    already looked explicitly set (see propertySchema#isExplicitValue), and editing
 *    any field's value is an escape hatch that activates it regardless.
 *  - edit: seeded from the saved preset; everything starts active (it was already
 *    curated once), and clicking a field's label toggles it off/on directly. */
export function PresetEditor(props: PresetEditorProps) {
  const {onSaved, onCancel} = props

  const [draft, setDraft] = useState<DraftPreset>(() =>
    props.mode === 'create'
      ? captureFromNode(props.node)
      : {
          name: props.preset.name,
          // Presets saved before a given field existed won't have its key at all —
          // there's no live node here to re-check its guard against, so just assume it
          // applies (applying to an incompatible node later is still filtered out by
          // that guard in applyPreset.ts).
          properties: withDefaults(props.preset.properties, {
            overflow: null,
            borderRadius: null,
            opacity: null,
            visible: null,
            zIndex: null,
            squircle: 100,
            pointerEvents: 'auto',
          }),
        },
  )
  const [appearance, setAppearance] = useState(() =>
    props.mode === 'edit' ? {icon: props.preset.icon, color: props.preset.color} : DEFAULT_PRESET_APPEARANCE,
  )
  const [computedSize, setComputedSize] = useState<{width: number | null; height: number | null}>({
    width: null,
    height: null,
  })

  // Fetch the live node's actual rendered size once, for Width/Height's "Fit" display —
  // create mode only, since edit mode has no live node to measure. `getRect` is an
  // unprotected read (see DesignPanel's identical comment), so the only failure mode is a
  // genuine rejection, not a permission denial — the promise chain previously had no
  // `.catch()` at all here, so a rejection would have surfaced as an unhandled promise
  // rejection (caught by main.tsx's global handler, replacing the whole editor with the
  // "Something went wrong" screen over what's really just a cosmetic Fit-display miss).
  useEffect(() => {
    if (props.mode !== 'create') return
    let active = true
    const node = props.node as {getRect?: () => Promise<{width: number; height: number} | null>}
    void node.getRect
      ?.()
      .then((rect) => {
        if (!active) return
        setComputedSize({width: rect?.width ?? null, height: rect?.height ?? null})
      })
      .catch((error: unknown) => {
        console.error('Failed to read layer size', error)
        if (active) notifyThrottled('layer-rect-read', "Couldn't read this layer's size.", 'warning')
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [initiallyIncluded] = useState<Set<PresetPropertyKey>>(() =>
    props.mode === 'create' ? computeInitiallyIncluded(draft.properties) : new Set(),
  )
  const [touchedKeys, setTouchedKeys] = useState<Set<PresetPropertyKey>>(new Set())
  const [removedKeys, setRemovedKeys] = useState<Set<PresetPropertyKey>>(new Set())
  const [saveState, setSaveState] = useState<SaveState>({kind: 'idle'})

  const nodeName =
    props.mode === 'create' ? (supportsName(props.node) ? (props.node.name ?? 'this layer') : 'this layer') : null

  const isIncluded = (key: PresetPropertyKey) =>
    props.mode === 'edit' ? !removedKeys.has(key) : initiallyIncluded.has(key) || touchedKeys.has(key)

  const commit = (changes: PresetProperties) => {
    setDraft((prev) => ({...prev, properties: {...prev.properties, ...changes}}))
    if (props.mode === 'create') {
      const keys = Object.keys(changes) as PresetPropertyKey[]
      setTouchedKeys((prev) => {
        const next = new Set(prev)
        for (const key of keys) next.add(key)
        return next
      })
    }
  }

  const toggleIncluded = (key: PresetPropertyKey) => {
    setRemovedKeys((prev) => {
      const next = new Set(prev)
      // The alignment grid stands in for the two distribute/align keys plus Wrap's
      // toggle button, so its label toggles all three in lockstep — none of them has a
      // separate row of its own to toggle individually.
      const keys: PresetPropertyKey[] =
        key === 'stackAlignment' ? ['stackAlignment', 'stackDistribution', 'stackWrapEnabled'] : [key]
      const willRemove = !next.has(key)
      for (const target of keys) {
        if (willRemove) next.add(target)
        else next.delete(target)
      }
      return next
    })
  }

  // Edit mode: clearing a field (backspace to empty, then blur) nulls it and drops it
  // from the preset — the same "removed" set the label-toggle uses.
  const clearField = (key: PresetPropertyKey) => {
    commit({[key]: null})
    setRemovedKeys((prev) => new Set(prev).add(key))
  }

  const fieldProps = (key: PresetPropertyKey) =>
    buildFieldProps(key, {
      properties: draft.properties,
      isIncluded,
      commit,
      onToggleIncluded: props.mode === 'edit' ? toggleIncluded : undefined,
      onClear: props.mode === 'edit' ? clearField : undefined,
      computedSize: props.mode === 'create' ? computedSize : undefined,
    })

  const handleSave = async () => {
    const name = draft.name?.trim()
    if (!name) return

    setSaveState({kind: 'saving'})

    // Wrapped in try/catch so any failure the storage layer didn't anticipate (as
    // opposed to the expected `{ok: false}` results already handled below) still
    // lands back on a visible error message instead of leaving `saveState` stuck on
    // "saving" forever — with no in-progress indicator on the button itself, a stuck
    // save is otherwise indistinguishable from the click having done nothing at all.
    try {
      if (props.mode === 'edit') {
        const includedKeys = new Set(
          (Object.keys(draft.properties) as PresetPropertyKey[]).filter((key) => !removedKeys.has(key)),
        )
        const result = await updatePreset(props.preset, name, finalizePreset(draft.properties, includedKeys), appearance)
        if (!result.ok) {
          setSaveState({kind: 'error', message: result.message})
          return
        }
        onSaved()
        return
      }

      const includedKeys = new Set([...initiallyIncluded, ...touchedKeys])
      const result = await createPreset(name, finalizePreset(draft.properties, includedKeys), appearance)

      if (!result.ok) {
        setSaveState({kind: 'error', message: result.message})
        return
      }

      if (result.value.fellBackToLocal) {
        setSaveState({kind: 'note', message: 'Saved to this device — synced storage is full.'})
        window.setTimeout(onSaved, 1400)
      } else {
        onSaved()
      }
    } catch (error) {
      console.error('Failed to save preset', error)
      const message = error instanceof Error ? error.message : 'Failed to save preset.'
      setSaveState({kind: 'error', message})
      notify(message, 'error')
    }
  }

  const isSaving = saveState.kind === 'saving'

  return (
    <main className='preset-editor'>
      <div className='preset-editor-name-row'>
        <div className='preset-editor-name-line'>
          <PresetIconPicker icon={appearance.icon} color={appearance.color} onChange={setAppearance} />
          <PresetNameField value={draft.name} onChange={(name) => setDraft((prev) => ({...prev, name}))} />
        </div>
        {props.mode === 'create' && props.selectionCount > 1 && (
          <p className='preset-editor-hint'>
            Captured from {nodeName}. {props.selectionCount - 1} other layer
            {props.selectionCount - 1 === 1 ? '' : 's'} also selected.
          </p>
        )}
      </div>

      <div className='property-scroll framer-hide-scrollbar'>
        <PropertySections fieldProps={fieldProps} />
      </div>

      <div className='preset-editor-footer'>
        {saveState.kind === 'error' && <p className='preset-editor-message is-error'>{saveState.message}</p>}
        {saveState.kind === 'note' && <p className='preset-editor-message is-note'>{saveState.message}</p>}
        <div className='preset-editor-actions'>
          <button type='button' onClick={onCancel} disabled={isSaving}>
            Cancel
          </button>
          <button
            type='button'
            className='framer-button-primary'
            onClick={handleSave}
            disabled={isSaving || draft.name?.trim().length === 0}
          >
            Save
          </button>
        </div>
      </div>
    </main>
  )
}
