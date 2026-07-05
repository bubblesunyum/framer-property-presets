import { framer, type CanvasNode } from "framer-plugin"
import { useEffect, useState } from "react"

export function useSelection(): CanvasNode[] {
    const [selection, setSelection] = useState<CanvasNode[]>([])

    useEffect(() => framer.subscribeToSelection(setSelection), [])

    return selection
}
