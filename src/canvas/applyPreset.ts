import type { CanvasNode } from "framer-plugin"
import { descriptorFor } from "../schema/propertySchema"
import type { Preset, PresetPropertyKey } from "../types/preset"

interface SettableNode {
    setAttributes: (attributes: Record<string, unknown>) => Promise<unknown>
}

export interface ApplyOutcome {
    appliedCount: number
    skippedCount: number
    failedNodes: { node: CanvasNode; error: unknown }[]
}

/** Applies only the subset of `preset.properties` each target node actually supports
 *  (per the same per-field guards the schema/capture step uses), batched into one
 *  `setAttributes` call per node so a single click is a single native-undo step. */
export async function applyPresetToSelection(preset: Preset, selection: CanvasNode[]): Promise<ApplyOutcome> {
    const outcome: ApplyOutcome = { appliedCount: 0, skippedCount: 0, failedNodes: [] }

    await Promise.all(
        selection.map(async (node) => {
            const payload: Record<string, unknown> = {}

            for (const key of Object.keys(preset.properties) as PresetPropertyKey[]) {
                const descriptor = descriptorFor(key)
                // Synthetic fields (Squircle, Pointer Events) have no real attribute in
                // the framer-plugin SDK — they're stored/edited like any other property
                // but never sent to the real node.
                if (!descriptor || descriptor.synthetic || !descriptor.guard(node)) continue
                payload[key] = preset.properties[key]
            }

            if (Object.keys(payload).length === 0) {
                outcome.skippedCount += 1
                return
            }

            try {
                // Every key above was checked against this node's real support guard,
                // so the call is safe even though `payload`'s static type can't express
                // which concrete node-attribute shape it satisfies.
                await (node as unknown as SettableNode).setAttributes(payload)
                outcome.appliedCount += 1
            } catch (error) {
                outcome.failedNodes.push({ node, error })
            }
        })
    )

    return outcome
}

/** Live-edit path (Design panel): writes a small set of attribute changes to every
 *  selected node that supports each key. Fire-and-forget — each node is written
 *  independently so one unsupported/failed node doesn't block the others, and failures
 *  are logged rather than surfaced (the panel stays responsive as the user edits). */
export async function applyAttributesToSelection(
    changes: Record<string, unknown>,
    selection: CanvasNode[]
): Promise<void> {
    await Promise.all(
        selection.map(async (node) => {
            const payload: Record<string, unknown> = {}

            for (const key of Object.keys(changes) as PresetPropertyKey[]) {
                const descriptor = descriptorFor(key)
                if (!descriptor || descriptor.synthetic || !descriptor.guard(node)) continue
                payload[key] = changes[key]
            }

            if (Object.keys(payload).length === 0) return

            try {
                await (node as unknown as SettableNode).setAttributes(payload)
            } catch (error) {
                console.error("Live edit failed for node", node, error)
            }
        })
    )
}
