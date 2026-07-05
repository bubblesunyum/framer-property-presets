const encoder = new TextEncoder()

export function byteLength(value: string): number {
    return encoder.encode(value).length
}
