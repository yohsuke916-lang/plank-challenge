import { describe, expect, it } from 'vitest'
import { calculateStreak } from './dates'
import { loadData } from './storage'
import { remainingSeconds } from './timer'
import type { SessionRecord } from '../types'

const record = (date: string): SessionRecord => ({
  id: date,
  date,
  seconds: 30,
  completed: true,
  completedAt: `${date}T10:00:00.000Z`,
})

describe('remainingSeconds', () => {
  it('uses the scheduled end time rather than tick count', () => {
    expect(remainingSeconds(120_000, 89_101)).toBe(31)
    expect(remainingSeconds(120_000, 120_001)).toBe(0)
  })
})

describe('calculateStreak', () => {
  it('counts completed dates across a month boundary', () => {
    const now = new Date(2026, 6, 1, 12)
    expect(calculateStreak([record('2026-07-01'), record('2026-06-30'), record('2026-06-29')], now)).toBe(3)
  })

  it('shows the contiguous streak through yesterday when today is not complete', () => {
    const now = new Date(2026, 6, 11, 12)
    expect(calculateStreak([record('2026-07-10'), record('2026-07-09')], now)).toBe(2)
  })
})

describe('loadData', () => {
  it('starts safely when localStorage contains invalid JSON', () => {
    const originalWindow = globalThis.window
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { localStorage: { getItem: () => '{not json' } },
    })
    expect(loadData()).toEqual({ version: 1, records: [] })
    Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow })
  })
})
