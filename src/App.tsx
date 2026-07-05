import type { CanvasNode } from "framer-plugin"
import { useState } from "react"
import { PresetEditor } from "./components/PresetEditor"
import { PresetList } from "./components/PresetList"
import { useSelection } from "./hooks/useSelection"
import type { Preset } from "./types/preset"

type View =
    | { screen: "list" }
    | { screen: "create"; node: CanvasNode; selectionCount: number }
    | { screen: "edit"; preset: Preset }

export function App() {
    const selection = useSelection()
    const [view, setView] = useState<View>({ screen: "list" })

    if (view.screen === "create") {
        return (
            <PresetEditor
                mode="create"
                node={view.node}
                selectionCount={view.selectionCount}
                onSaved={() => setView({ screen: "list" })}
                onCancel={() => setView({ screen: "list" })}
            />
        )
    }

    if (view.screen === "edit") {
        return (
            <PresetEditor
                mode="edit"
                preset={view.preset}
                onSaved={() => setView({ screen: "list" })}
                onCancel={() => setView({ screen: "list" })}
            />
        )
    }

    return (
        <PresetList
            selection={selection}
            onRequestNew={() => {
                const [primary] = selection
                if (!primary) return
                setView({ screen: "create", node: primary, selectionCount: selection.length })
            }}
            onRequestEdit={(preset) => setView({ screen: "edit", preset })}
        />
    )
}
