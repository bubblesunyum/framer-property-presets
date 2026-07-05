import { useBufferedInput } from "../hooks/useBufferedInput"

interface TextFieldProps {
    value: string
    placeholder?: string
    onChange: (value: string) => void
}

/** Plain buffered text input for the schema's free-text "length" control (grid
 *  column/row counts, padding shorthand) — commits on blur/Enter instead of every
 *  keystroke, same reasoning as PresetEditor's name field (see useBufferedInput). */
export function TextField({ value, placeholder, onChange }: TextFieldProps) {
    const [pending, setPending, commit] = useBufferedInput(value, onChange)

    return (
        <input
            type="text"
            value={pending}
            placeholder={placeholder ?? "auto"}
            onChange={(event) => setPending(event.currentTarget.value)}
            onBlur={commit}
            onKeyDown={(event) => {
                if (event.key === "Enter") commit()
            }}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
        />
    )
}
