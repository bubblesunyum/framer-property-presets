import type { CanvasNode } from "framer-plugin"
import { PROPERTY_SCHEMA } from "../schema/propertySchema"
import { createDraftFromProperties, type DraftPreset, type PresetProperties } from "../types/preset"

/** Single top-to-bottom pass over the schema: shared layout fields (`layout`, `gap`,
 *  `padding`) are captured before stack/grid-specific fields, so `visibleWhen` checks
 *  against the properties captured so far correctly pick up only the sub-group that
 *  matches this node's actual layout value, with no lookahead needed. */
export function captureFromNode(node: CanvasNode): DraftPreset {
    const properties: PresetProperties = {}

    for (const descriptor of PROPERTY_SCHEMA) {
        if (!descriptor.guard(node)) continue
        if (descriptor.visibleWhen && !descriptor.visibleWhen(properties)) continue

        const value = (node as unknown as Record<string, unknown>)[descriptor.key]
        if (value !== undefined) properties[descriptor.key] = value
    }

    return createDraftFromProperties(properties)
}
