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
                if (!descriptor || !descriptor.guard(node)) continue
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
