# ARCHITECTURE.md

Expands on [CLAUDE.md](./CLAUDE.md)'s structure and data-flow philosophy.

## Composition first

Default to composing small components together. Reach for another pattern —
HOCs, render props, class-inheritance-style mixins, a config-driven rendering
engine — only when composition is overwhelmingly more awkward, and even then
try a hook before reaching for a structural pattern change.

## Atomic composition

Build from small primitives up, each layer composing the one below it rather
than reaching past it:

```
VStack / HStack   →   List, ListRow   →   ConversationList   →   ConversationsScreen
```

A primitive (`VStack`) shouldn't know about a domain (`Conversation`); a
screen shouldn't reimplement layout a primitive already solved. Noticing the
same JSX + logic shape twice is the primitive asking to be extracted.

## Capabilities, not features

When asked for a feature, look for the reusable capability underneath it
before building the one-off. For exmaple, when asked to add infinite scroll to a conversation
list, build `InfiniteList` — it owns loading-more-near-the-end and its own
loading/end states — and have `ConversationList` use it, rather than wiring
scroll-position math directly into `ConversationsScreen`. The next screen
that needs infinite scroll gets it for free.

## Component shape

- One component, roughly one responsibility. Doing layout _and_
  data-fetching _and_ three conditional render branches is a component
  asking to be split.
- Don't over-split, either. A few small private subcomponents living in the
  same file as the component that uses them is good organization, it keeps related code physically together. Promote one to its own
  file only once something else needs to import it, or the file is genuinely
  hard to scan.
- Extend the underlying element's native props type (`ViewProps`,
  `PressableProps`, `ComponentProps<'button'>`) and spread the rest through,
  rather than redeclaring props the platform already gives you.
- Avoid deep nesting in JSX and in logic — it's harder to read, more
  bug-prone, and often a perf problem (unnecessarily wide re-render scope).
  Flatten with early returns, extracted subcomponents, or extracted hooks
  before adding another level.

### Ergonomic APIs, graceful states built in

It's worth extra internal machinery to make a component pleasant at the call
site: boolean shorthand props (`<Text sm accent bold>`), polymorphic props
that accept a string key or a full node (`title="someKey" | title={<Custom />}`),
and a `loading`/empty state handled _inside_ the component (skeleton,
placeholder) so every caller gets it for free instead of reimplementing it.
This is a deliberate tradeoff of internal complexity for call-site simplicity
— lean into it for shared/foundation components, not for one-off screens. At the same time, be wary of ever-increasing complexity. Sometimes a slightly less ergonomic or elegant call site may be dramatically simpler internally and should be preferred for stability and maintainability.

### File organization

For a component of any real size: public API first, private
helpers/subcomponents next, then static styles/types/config constants at the
bottom. For longer files, plain section banners (`// STYLE`, `// TYPES`,
`// HELPERS`) make the file skimmable — use them once a file has enough
sections to need signposting, not on every three-line file.

## Hooks for organization, not just reuse

Group related state and logic into a hook even when it'll only ever be used
once. Treat a hook the way you'd treat breaking a long function into smaller
functions in any other language — a unit of organization, not only a unit of
reuse. A component's body should read like a short list of "what this screen
needs," each backed by a hook, not a wall of intermixed `useState`/`useEffect`
calls.

- Hooks accept and return plain values to share data between each other —
  compose hooks by threading values through, the same way you'd compose
  functions.
- Return shape signals intent: a tuple for a small positional pair
  (`[value, setValue]`-shaped), an object for a named bag of several things.
- A non-obvious hook is worth a one-line usage example in a doc comment —
  it pays for itself the first time someone has to guess the call signature.

## Providers over prop-drilling

Default to a provider + context (or equivalent app-level store) for data used
by more than one or two components down the tree. Prop-drill only when the
drilling is shallow (one, maybe two levels) or the parent/child are
intentionally tightly coupled and unlikely to be used apart.

A reusable provider factory beats hand-rolling `createContext`/`useContext`
boilerplate every time:

```tsx
function createProvider<T>(useValue: () => T) {
  const Context = createContext<T | null>(null)
  const Provider = ({children}: PropsWithChildren) => <Context.Provider value={useValue()}>{children}</Context.Provider>
  const useProviderContext = () => {
    const value = useContext(Context)
    if (!value) throw new Error('must be used within its Provider')
    return value
  }
  return [Provider, useProviderContext] as const
}
```

For UI that needs to be triggered from anywhere without threading a callback
down (a global alert, a sheet/modal), a module-level imperative escape hatch
is a reasonable exception: export a `let` function that throws until the
provider mounts and reassigns it, and always update state with the
`prev => next` form since it's called from outside React's render cycle.
Reach for this only for that narrow case, not as a general alternative to
context.

## JSX as configuration

Prefer expressing variation directly in JSX over building an intermediate
JS/JSON config object that gets mapped into JSX later:

```tsx
// prefer — structure is visible at the call site
<Page>
  <Section title="How"><How items={howItems} /></Section>
  <Section title="Why"><Why items={whyItems} /></Section>
</Page>

// over inflating a config object into the same shape
const sections = [{ title: 'How', Component: How, items: howItems }, ...];
<Page>
  {sections.map((s) => (
    <Section title={s.title}><s.Component items={s.items} /></Section>
  ))}
</Page>
```

Config objects still earn their place for genuinely data-shaped content (a
static list of options, copy blocks handed to a shared renderer). The smell
to watch for: the mapping layer growing more complex than the JSX it
would've replaced, or losing the ability to tell what the app looks like
without mentally executing the config.
