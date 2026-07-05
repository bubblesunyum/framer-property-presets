import {supportsName, type CanvasNode} from 'framer-plugin'
import {useState} from 'react'
import {captureFromNode} from '../canvas/capturePreset'
import {useBufferedInput} from '../hooks/useBufferedInput'
import {EDITOR_ROWS} from '../schema/editorLayout'
import {descriptorFor, isExplicitValue} from '../schema/propertySchema'
import {createPreset, updatePreset} from '../storage/presetRepository'
import {
  finalizePreset,
  type DraftPreset,
  type Preset,
  type PresetProperties,
  type PresetPropertyKey,
  type PropertyGroup,
} from '../types/preset'
import './PresetEditor.css'
import {PinWidget} from './PinWidget'
import {PropertyColumnPair, PropertyControlOnly, PropertyFieldPair, PropertyRow, type FieldProps} from './PropertyRow'

export type PresetEditorProps =
  | {mode: 'create'; node: CanvasNode; selectionCount: number; onSaved: () => void; onCancel: () => void}
  | {mode: 'edit'; preset: Preset; onSaved: () => void; onCancel: () => void}

type SaveState = {kind: 'idle' | 'saving'} | {kind: 'error' | 'note'; message: string}

const GROUPS: {key: PropertyGroup; title: string}[] = [
  {key: 'position', title: 'Position'},
  {key: 'size', title: 'Size'},
  {key: 'layout', title: 'Layout'},
]

/** Derives the Flow control's displayed value from the two underlying keys it
 *  composites — Row/Column both mean `layout: "stack"`, differing only in
 *  `stackDirection`, which no longer has its own editor row. */
function flowValueFor(properties: PresetProperties): string {
  if (properties.layout === 'grid') return 'grid'
  if (properties.layout === 'stack') return properties.stackDirection === 'horizontal' ? 'row' : 'column'
  return 'none'
}

function computeInitiallyIncluded(properties: DraftPreset['properties']): Set<PresetPropertyKey> {
  const included = new Set<PresetPropertyKey>()
  for (const key of Object.keys(properties) as PresetPropertyKey[]) {
    if (isExplicitValue(key, properties[key])) included.add(key)
  }
  return included
}

type EditorRowState =
  | {solo: FieldProps | null}
  | {pair: readonly [FieldProps | null, FieldProps | null]}
  | {columns: readonly [FieldProps[], FieldProps[]]}

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
      : {name: props.preset.name, properties: props.preset.properties},
  )
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

  const updateProperty = (key: PresetPropertyKey, value: unknown) => {
    setDraft((prev) => ({...prev, properties: {...prev.properties, [key]: value}}))
    if (props.mode === 'create') setTouchedKeys((prev) => (prev.has(key) ? prev : new Set(prev).add(key)))
  }

  const toggleIncluded = (key: PresetPropertyKey) => {
    setRemovedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const fieldProps = (key: PresetPropertyKey): FieldProps | null => {
    const descriptor = descriptorFor(key)
    if (!descriptor) return null
    if (!Object.prototype.hasOwnProperty.call(draft.properties, key)) return null
    if (descriptor.visibleWhen && !descriptor.visibleWhen(draft.properties)) return null

    // Flow is a composite control over two underlying keys (`layout` +
    // `stackDirection`, folding direction into Row/Column) rather than a plain
    // 1:1 field — special-cased here so PropertyRow/renderControl stay generic.
    if (key === 'layout') {
      return {
        descriptor,
        value: flowValueFor(draft.properties),
        included: isIncluded(key),
        onChange: (next) => {
          if (next === null || next === 'grid') {
            updateProperty('layout', next)
            return
          }
          setDraft((prev) => ({
            ...prev,
            properties: {
              ...prev.properties,
              layout: 'stack',
              stackDirection: next === 'row' ? 'horizontal' : 'vertical',
            },
          }))
          if (props.mode === 'create') {
            setTouchedKeys((prev) => new Set(prev).add('layout').add('stackDirection'))
          }
        },
        onToggleIncluded: props.mode === 'edit' ? () => toggleIncluded(key) : undefined,
      }
    }

    return {
      descriptor,
      value: draft.properties[key],
      included: isIncluded(key),
      onChange: (value) => updateProperty(key, value),
      onToggleIncluded: props.mode === 'edit' ? () => toggleIncluded(key) : undefined,
    }
  }

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
        const result = await updatePreset(props.preset, name, finalizePreset(draft.properties, includedKeys))
        if (!result.ok) {
          setSaveState({kind: 'error', message: result.message})
          return
        }
        onSaved()
        return
      }

      const includedKeys = new Set([...initiallyIncluded, ...touchedKeys])
      const result = await createPreset(name, finalizePreset(draft.properties, includedKeys))

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
      setSaveState({kind: 'error', message: error instanceof Error ? error.message : 'Failed to save preset.'})
    }
  }

  const isSaving = saveState.kind === 'saving'

  return (
    <main className='preset-editor'>
      <div className='preset-editor-name-row'>
        <PresetNameField value={draft.name} onChange={(name) => setDraft((prev) => ({...prev, name}))} />
        {props.mode === 'create' && props.selectionCount > 1 && (
          <p className='preset-editor-hint'>
            Captured from {nodeName}. {props.selectionCount - 1} other layer
            {props.selectionCount - 1 === 1 ? '' : 's'} also selected.
          </p>
        )}
      </div>

      <div className='preset-editor-scroll framer-hide-scrollbar'>
        {GROUPS.map(({key, title}) => {
          const pins =
            key === 'position'
              ? {
                  top: fieldProps('top'),
                  right: fieldProps('right'),
                  bottom: fieldProps('bottom'),
                  left: fieldProps('left'),
                }
              : null
          const hasPins = pins && (pins.top || pins.right || pins.bottom || pins.left)

          const rows: EditorRowState[] = EDITOR_ROWS[key]
            .map((row): EditorRowState => {
              if (typeof row === 'string') return {solo: fieldProps(row)}
              if ('columns' in row) {
                return {
                  columns: [
                    row.columns[0].map(fieldProps).filter((field): field is FieldProps => field !== null),
                    row.columns[1].map(fieldProps).filter((field): field is FieldProps => field !== null),
                  ],
                }
              }
              return {pair: [fieldProps(row[0]), fieldProps(row[1])]}
            })
            .filter((row) => {
              if ('solo' in row) return row.solo !== null
              if ('pair' in row) return row.pair[0] !== null || row.pair[1] !== null
              return row.columns[0].length > 0 || row.columns[1].length > 0
            })

          return (
            <section key={key} className='preset-editor-section'>
              <div className='framer-divider' />
              <h3 className='preset-editor-heading'>{title}</h3>
              {!hasPins && rows.length === 0 ? (
                <p className='preset-editor-empty'>This layer doesn't support {title.toLowerCase()} properties.</p>
              ) : (
                <>
                  {pins && hasPins && (
                    <div className='position-cross'>
                      {pins.top && (
                        <div className='position-cross-top'>
                          <PropertyControlOnly {...pins.top} />
                        </div>
                      )}
                      <div className='position-cross-middle'>
                        {pins.left && <PropertyControlOnly {...pins.left} />}
                        <PinWidget
                          top={pins.top?.value != null}
                          right={pins.right?.value != null}
                          bottom={pins.bottom?.value != null}
                          left={pins.left?.value != null}
                        />
                        {pins.right && <PropertyControlOnly {...pins.right} />}
                      </div>
                      {pins.bottom && (
                        <div className='position-cross-bottom'>
                          <PropertyControlOnly {...pins.bottom} />
                        </div>
                      )}
                    </div>
                  )}
                  {rows.map((row, index) => {
                    if ('solo' in row) return row.solo && <PropertyRow key={index} {...row.solo} />
                    if ('pair' in row) return <PropertyFieldPair key={index} left={row.pair[0]} right={row.pair[1]} />
                    return <PropertyColumnPair key={index} left={row.columns[0]} right={row.columns[1]} />
                  })}
                </>
              )}
            </section>
          )
        })}
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
