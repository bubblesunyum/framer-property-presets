# CLAUDE.md — React + TypeScript Starter

Philosophy and patterns for framer plugin. This is durable taste, not a substitute for reading the actual code once there is some.

## Philosophy

- **Composition over any other React pattern.** Reach for HOCs, render props,
  or config-driven rendering engines only when composition is overwhelmingly
  more awkward — that should be rare. See [ARCHITECTURE.md](./ARCHITECTURE.md).
- **Build capabilities, not isolated features.** Asked to add infinite scroll
  to one list? Build the reusable `InfiniteList` primitive and use it there —
  don't wire the behavior directly into one screen.
- **JSX is configuration.** Prefer expressing structure directly in JSX over
  building a JS/JSON config object that JSX then inflates. JSX is already a
  layout language; splitting structure from its data representation makes the
  app harder to picture. Config objects earn their place when content is
  genuinely data-shaped (a static options list) or complexity has truly
  outgrown JSX — not by default.
- **Simplest structure the language/framework allows.** Don't add an
  abstraction layer, a generic engine, or a pattern when a plain component or hook
  would do fine.
- **Small, single-purpose components; deep nesting is a smell.** If a
  component does more than roughly one thing, or JSX/logic nests more than a
  few levels, extract — most naturally as a private subcomponent in the same
  file, not automatically a new one. Minimal wrapping elements: don't add an
  extra View/div "just in case."

Component/hook shape, providers vs. prop-drilling, and atomic composition are
worth expanding on — see [ARCHITECTURE.md](./ARCHITECTURE.md).

If the project accumulates enough shared spacing/color/type values that
hardcoded numbers start repeating, see [STYLE.md](./STYLE.md) for a pattern
that's worked well. Skip it if the project is small or already has a mature
styling system.

## Naming

Lean toward Apple's precision but note that their verbosity sometimes goes overboard: aim for the fewest words that
still fully and unambiguously describe the thing. A good name reads like a
small piece of documentation — `InfiniteList`, not `List2` or
`ScrollableInfiniteList`. Booleans read as booleans (`isVisible`,
`shouldRetry`), never `flag`/`data`-shaped. Avoid extra words, e.g. `ScrollableInfiniteList` not `ScrollableInfiniteContentList`.

## Comments

Rare by default — clear names and structure shouldn't need narration most of the time. When
one shows up, it explains a _why_: a workaround, a non-obvious constraint, useful context, a
platform gotcha, etc. Never restate what the code already says.

## Types

- Derive from the source of truth rather than duplicating:
  `type FooProps = Parameters<typeof Foo>[0]`; types off API/schema responses
  rather than hand-typed shadows of them.
- `import type` for type-only imports.

## Animation

- prefer animated components over ones that cause the ui to jump between states.
- the goal with animation is to show the easier where something came from and where it will go back to—give the eye something to follow.
- don't animate everything. only animate when showing where something is going is useful to keep the user oriented.
- animate some things just for fun. in a few cases, when an interaction warrants it, add a delightful and surprising flourish. these should be worth it: fluid, springy, and buttery smooth.
- turn animations into capabilities—hooks, wrapping components, etc. give them beautiful defaults and make it easy to override/customize behavior through elegant & terse declarative call-sites.

## Testing

Mock at the boundary (network, native modules), not internals. Query by
role/text/testID the way a user would, not by implementation detail. Build
fixture factories (`mockUser()`, `mockConversation()`) instead of inlining
ad-hoc objects everywhere. Focus on testing usability and flow via ui-driven tools like playwright, and test logic via unit-tested hooks.

## Commits

Default to lowercase, terse, plain English — no conventional-commit prefixes
unless the project already enforces them. commit often, after a complete feature or capability, once the work reaches a point where the app builds and runs without errors. don't be afraid to commit after completing sub-capabilities / infrastructure too, even if they have no user-facing piece. any complete capabaility is a good time to commit.
