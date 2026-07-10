import {describe, expect, it} from 'vitest'
import {convertedAmount} from './LengthField'

describe('convertedAmount', () => {
  const ctx = {renderedPx: 180, parentPx: 400, viewportPx: 900}

  it('switching to fill always resets to 1', () => {
    expect(convertedAmount('fr', {currentAmount: 375, ...ctx})).toBe(1)
  })

  it('switching to fit has no numeric value', () => {
    expect(convertedAmount('fit-content', {currentAmount: 375, ...ctx})).toBeNull()
  })

  it('switching to fit-image has no numeric value', () => {
    expect(convertedAmount('fit-image', {currentAmount: 375, ...ctx})).toBeNull()
  })

  it('switching to px keeps the rendered pixel size', () => {
    expect(convertedAmount('px', {currentAmount: 50, ...ctx})).toBe(180)
  })

  it('switching to % expresses the rendered size as a fraction of the parent', () => {
    // 180 / 400 = 45%
    expect(convertedAmount('%', {currentAmount: 375, ...ctx})).toBe(45)
  })

  it('switching to vh expresses the rendered size as a fraction of the viewport', () => {
    // 180 / 900 = 20vh
    expect(convertedAmount('vh', {currentAmount: 375, ...ctx})).toBe(20)
  })

  it('keeps the current amount when the pixel context is unknown', () => {
    expect(convertedAmount('%', {currentAmount: 375, renderedPx: 180, parentPx: null})).toBe(375)
    expect(convertedAmount('px', {currentAmount: 375, renderedPx: null})).toBe(375)
  })
})
