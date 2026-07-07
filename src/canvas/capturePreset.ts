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

        // Synthetic fields (Squircle, Pointer Events) have no real node attribute to
        // read at all — Squircle defaults to 100% for every element, Pointer Events
        // defaults to "auto" (CSS's own default, and the common case).
        if (descriptor.key === "squircle") {
            properties[descriptor.key] = 100
            continue
        }
        if (descriptor.key === "pointerEvents") {
            properties[descriptor.key] = "auto"
            continue
        }
        if (descriptor.synthetic) {
            properties[descriptor.key] = null
            continue
        }

        // Always record the key once the guard says it applies to this node — even if
        // the live SDK value happens to come back `undefined` for some edge case (e.g.
        // a trait whose value is normally expressed via a different sibling property).
        // Silently skipping it here previously meant a structurally-supported field
        // (e.g. Clip Content on some node types) could fail to capture at all.
        const value = (node as unknown as Record<string, unknown>)[descriptor.key]
        properties[descriptor.key] = value === undefined ? null : value
    }

    return createDraftFromProperties(properties)
}
