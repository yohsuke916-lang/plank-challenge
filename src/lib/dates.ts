import type { SessionRecord } from '../types'

export function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDate(key: string): string {
  const [, month, day] = key.split('-')
  return `${Number(month)}/${Number(day)}`
}

export function hasCompletedToday(records: SessionRecord[], now = new Date()): boolean {
  return records.some((record) => record.date === localDateKey(now))
}

export function calculateStreak(records: SessionRecord[], now = new Date()): number {
  const completedDays = new Set(records.map((record) => record.date))
  const cursor = new Date(now)
  let streak = 0

  while (completedDays.has(localDateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  if (streak === 0) {
    cursor.setDate(cursor.getDate() - 1)
    while (completedDays.has(localDateKey(cursor))) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    }
  }

  return streak
}
