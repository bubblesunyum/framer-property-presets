import {describe, expect, it} from 'vitest'
import {createDragValueTracker} from './dragValueTracker'

describe('createDragValueTracker', () => {
  it('increases the value as the pointer moves up (smaller Y)', () => {
    const tracker = createDragValueTracker(10)
    tracker.start(100)
    const next = tracker.move(90, 1, -Infinity, Infinity)
    expect(next).toBe(20)
    expect(tracker.value).toBe(20)
  })

  it('decreases the value as the pointer moves down (larger Y)', () => {
    const tracker = createDragValueTracker(10)
    tracker.start(100)
    const next = tracker.move(115, 1, -Infinity, Infinity)
    expect(next).toBe(-5)
  })

  it('scales movement by sensitivity', () => {
    const tracker = createDragValueTracker(0)
    tracker.start(100)
    expect(tracker.move(50, 2, -Infinity, Infinity)).toBe(100) // 50px up * 2/px
    expect(tracker.move(90, 0.5, -Infinity, Infinity)).toBe(5) // 10px up * 0.5/px
  })

  it('clamps to min/max', () => {
    const tracker = createDragValueTracker(0)
    tracker.start(100)
    expect(tracker.move(0, 1, 0, 50)).toBe(50)
    expect(tracker.move(1000, 1, 0, 50)).toBe(0)
  })

  it('does nothing on move() before start() — returns the last known value unchanged', () => {
    const tracker = createDragValueTracker(42)
    expect(tracker.move(0, 1, -Infinity, Infinity)).toBe(42)
    expect(tracker.isDragging).toBe(false)
  })

  // Regression test for the reported bug: a fast drag → release → drag-again sequence
  // must not "jump back" to the value the tracker started with — the second drag has to
  // pick up from wherever the first one actually left off.
  it('a second drag starts from where the first one ended, not from the original value', () => {
    const tracker = createDragValueTracker(10)

    tracker.start(100)
    tracker.move(80, 1, -Infinity, Infinity) // +20 -> 30
    tracker.end()
    expect(tracker.value).toBe(30)

    // Second drag begins immediately — no external `sync()` call happens in between,
    // simulating the parent component not having re-rendered yet.
    tracker.start(200)
    const secondResult = tracker.move(190, 1, -Infinity, Infinity) // +10 from 30, not from 10
    expect(secondResult).toBe(40)
  })

  it('sync() updates the base value while not dragging', () => {
    const tracker = createDragValueTracker(10)
    tracker.sync(99) // e.g. an external edit landed while idle
    tracker.start(100)
    expect(tracker.move(95, 1, -Infinity, Infinity)).toBe(104) // based on 99, not 10
  })

  it('sync() is ignored while a drag is in progress, so an external update cannot yank the value mid-gesture', () => {
    const tracker = createDragValueTracker(10)
    tracker.start(100)
    tracker.move(90, 1, -Infinity, Infinity) // -> 20
    tracker.sync(-1000) // e.g. a racing realtime-poll update — must not apply mid-drag
    const next = tracker.move(80, 1, -Infinity, Infinity) // continues from the drag's own state, not -1000
    expect(next).toBe(30)
  })

  it('end() clears dragging state and a later sync() takes effect again', () => {
    const tracker = createDragValueTracker(10)
    tracker.start(100)
    tracker.move(90, 1, -Infinity, Infinity)
    tracker.end()
    expect(tracker.isDragging).toBe(false)
    tracker.sync(7)
    expect(tracker.value).toBe(7)
  })
})
