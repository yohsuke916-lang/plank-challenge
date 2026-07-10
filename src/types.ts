export const DURATIONS = [30, 45, 60, 90] as const

export type Duration = (typeof DURATIONS)[number]

export type SessionRecord = {
  id: string
  date: string
  seconds: Duration
  completed: true
  completedAt: string
}

export type AppData = {
  version: 1
  records: SessionRecord[]
}

export type TimerStatus = 'idle' | 'countdown' | 'running' | 'paused' | 'complete'
