# STYLE.md

Expands on [CLAUDE.md](./CLAUDE.md)'s styling pointer. Use shared styles at the start of the project and update throughout, keeping things consistent and standardized. Adapt the underlying style type to whatever this project actually uses (React Native `ViewStyle`/`TextStyle`, a CSS-in-JS object, Tailwind class strings) — the pattern transfers, not the specific API.

## The pattern

Replace hardcoded values with small composable "atoms" — functions that are
also objects, so they work both invoked and as a static lookup:

```ts
const Padding = Object.assign((value: number) => ({padding: value}), {x1: {padding: 8}, x2: {padding: 16}})

Padding.x2 // { padding: 16 }
Padding(12) // { padding: 12 } — raw escape hatch when the scale doesn't cover it
```

Same shape for `Margin`, `Gap`, `Border`, `Background`, `Colored`,
`FontSize`, `Flex`, `Size`… Generate each from a single source-of-truth value
map (a small `mapObject`-style helper), not by hand-writing every key.

## Composing style

Style is an array of atoms, with any caller-supplied `style`/override spread
**last** so it always wins:

```tsx
<Stack style={[Flex.row, Align.center, Padding.x2, style]} {...props} />
```

Static, non-dynamic styles for a file live together at the bottom under a
`const s = { ... }`, referenced as `s.foo` — keeps the render output readable
and gives every style a name. Entries can be functions of props/state when
they vary (`s.tab(selected)`).

## Spacing scale

Pick one base unit (8px is a comfortable default) and derive every spacing
value as a multiple of it, exposed as named keys (`x1`, `x2`, `x1_5`…) rather
than scattered raw numbers. This is the single biggest thing that keeps a UI
visually consistent for near-zero ongoing effort.

## Color

Layer color in two tiers:

1. A raw palette named by hue + lightness (`gray_300`, `blue_500`) — the
   actual values.
2. Semantic aliases over it (`accent`, `border`, `error`, `text.muted`) —
   what components should actually reach for.

Reach for semantic names first, palette names second, and a raw hex value
close to never. A genuinely new color goes in the palette, then gets a
semantic name once more than one component needs it.

## When this is overkill

This solves one specific problem: hardcoded values sprawling across
hand-rolled inline styles. If a project already has a mature styling engine
(a full design-system package, Tailwind with a well-configured theme), don't
rebuild it — that problem doesn't exist here.
