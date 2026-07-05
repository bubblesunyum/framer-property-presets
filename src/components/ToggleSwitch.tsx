import "./ToggleSwitch.css"

interface ToggleSwitchProps {
    checked: boolean
    onChange: (checked: boolean) => void
}

/** A real checkbox underneath (keeps native semantics/keyboard support) visually
 *  hidden in favor of a sliding pill track, styled via the adjacent-sibling
 *  `:checked` selector rather than any JS state. */
export function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
    return (
        <label className="toggle-switch">
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} />
            <span className="toggle-switch-track" />
        </label>
    )
}
