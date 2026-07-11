import { framer, type CanvasNode } from "framer-plugin"
import { notifyThrottled } from "../lib/notify"
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

    // `setAttributes` is a protected method — calling it without checking first is what
    // produces the host's "tried to call setAttributes before asking for permission"
    // warning, and (unlike a normal rejected promise) that warning doesn't run through
    // this function's own try/catch, so it needs to be avoided up front instead of
    // handled after the fact. Same pattern as syncedStore.ts's `isAllowedTo("setPluginData")`
    // pre-check.
    if (!framer.isAllowedTo("setAttributes")) {
        outcome.skippedCount = selection.length
        return outcome
    }

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

export interface LiveApplyOutcome {
    /** True when the edit couldn't even be attempted because the plugin lacks the
     *  `setAttributes` permission. */
    notAllowed: boolean
    /** Number of selected nodes whose write threw. */
    failedCount: number
}

/** Live-edit path (Design panel): writes a small set of attribute changes to every
 *  selected node that supports each key. Each node is written independently so one
 *  unsupported/failed node doesn't block the others. Failures are surfaced to the user
 *  via a throttled notification (and returned to the caller) rather than only logged, so
 *  an edit that silently doesn't take isn't left unexplained. */
export async function applyAttributesToSelection(
    changes: Record<string, unknown>,
    selection: CanvasNode[]
): Promise<LiveApplyOutcome> {
    if (!framer.isAllowedTo("setAttributes")) {
        notifyThrottled("live-apply", "You don't have permission to edit this layer.", "error")
        return { notAllowed: true, failedCount: 0 }
    }

    let failedCount = 0

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
                failedCount += 1
                console.error("Live edit failed for node", node, error)
            }
        })
    )

    if (failedCount > 0) {
        notifyThrottled(
            "live-apply",
            failedCount === selection.length
                ? "Couldn't update the layer. It may be locked or protected."
                : `Couldn't update ${failedCount} of ${selection.length} layers.`,
            "error"
        )
    }

    return { notAllowed: false, failedCount }
}
