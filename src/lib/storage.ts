import type { AppData, SessionRecord } from '../types'

const STORAGE_KEY = 'plank-challenge:data'
const EMPTY_DATA: AppData = { version: 1, records: [] }

function isRecord(value: unknown): value is SessionRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    typeof record.date === 'string' &&
    typeof record.completedAt === 'string' &&
    record.completed === true &&
    [30, 45, 60, 90].includes(record.seconds as number)
  )
}

export function loadData(): AppData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_DATA
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return EMPTY_DATA
    const data = parsed as Partial<AppData>
    if (data.version !== 1 || !Array.isArray(data.records) || !data.records.every(isRecord)) {
      return EMPTY_DATA
    }
    return { version: 1, records: data.records }
  } catch {
    return EMPTY_DATA
  }
}

export function saveRecord(record: SessionRecord): AppData {
  const current = loadData()
  const data: AppData = { version: 1, records: [record, ...current.records].slice(0, 200) }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Storage can be unavailable (for example, private browsing). Training still works.
  }
  return data
}
