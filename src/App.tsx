import { useCallback, useEffect, useRef, useState } from 'react'
import { calculateStreak, formatDate, hasCompletedToday, localDateKey } from './lib/dates'
import { playCompletionFeedback, playCountdownFeedback, prepareAudio } from './lib/feedback'
import { loadData, saveRecord } from './lib/storage'
import { remainingSeconds } from './lib/timer'
import { DURATIONS, type Duration, type SessionRecord, type TimerStatus } from './types'

const COUNTDOWN_MS = 3_000

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

function App() {
  const [duration, setDuration] = useState<Duration>(30)
  const [records, setRecords] = useState<SessionRecord[]>(() => loadData().records)
  const [status, setStatus] = useState<TimerStatus>('idle')
  const [displaySeconds, setDisplaySeconds] = useState(30)
  const [countdownNumber, setCountdownNumber] = useState(3)
  const deadlineRef = useRef<number | null>(null)
  const workoutStartRef = useRef<number | null>(null)
  const pausedSecondsRef = useRef(30)
  const activeDurationRef = useRef<Duration>(30)
  const statusRef = useRef<TimerStatus>('idle')
  const audioContextRef = useRef<AudioContext | null>(null)
  const completionHandledRef = useRef(false)
  const lastCountdownSoundRef = useRef<number | null>(null)

  const updateStatus = (next: TimerStatus) => {
    statusRef.current = next
    setStatus(next)
  }

  const completeWorkout = useCallback(() => {
    if (completionHandledRef.current) return
    completionHandledRef.current = true
    deadlineRef.current = null
    workoutStartRef.current = null
    setDisplaySeconds(0)
    statusRef.current = 'complete'
    setStatus('complete')

    const completedAt = new Date()
    const record: SessionRecord = {
      id: createId(),
      date: localDateKey(completedAt),
      seconds: activeDurationRef.current,
      completed: true,
      completedAt: completedAt.toISOString(),
    }
    setRecords(saveRecord(record).records)
    playCompletionFeedback(audioContextRef.current)
  }, [])

  const tick = useCallback(() => {
    const currentStatus = statusRef.current
    const deadline = deadlineRef.current
    if (!deadline || (currentStatus !== 'countdown' && currentStatus !== 'running')) return

    const now = Date.now()
    const workoutStart = workoutStartRef.current ?? now
    if (now < workoutStart) {
      updateStatus('countdown')
      const count = Math.max(1, Math.ceil((workoutStart - now) / 1000))
      setCountdownNumber(count)
      if (lastCountdownSoundRef.current !== count) {
        lastCountdownSoundRef.current = count
        playCountdownFeedback(audioContextRef.current, count)
      }
      return
    }

    const remaining = remainingSeconds(deadline, now)
    updateStatus('running')
    setDisplaySeconds(remaining)
    if (remaining === 0) completeWorkout()
  }, [completeWorkout])

  useEffect(() => {
    const interval = window.setInterval(tick, 250)
    const onVisibilityChange = () => tick()
    window.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [tick])

  useEffect(() => {
    return () => {
      void audioContextRef.current?.close().catch(() => undefined)
    }
  }, [])

  const start = () => {
    audioContextRef.current = prepareAudio(audioContextRef.current)
    const now = Date.now()
    activeDurationRef.current = duration
    workoutStartRef.current = now + COUNTDOWN_MS
    deadlineRef.current = workoutStartRef.current + duration * 1000
    completionHandledRef.current = false
    lastCountdownSoundRef.current = 3
    setCountdownNumber(3)
    setDisplaySeconds(duration)
    updateStatus('countdown')
    playCountdownFeedback(audioContextRef.current, 3)
  }

  const pause = () => {
    if (statusRef.current !== 'running' || !deadlineRef.current) return
    pausedSecondsRef.current = remainingSeconds(deadlineRef.current)
    deadlineRef.current = null
    workoutStartRef.current = null
    setDisplaySeconds(pausedSecondsRef.current)
    updateStatus('paused')
  }

  const resume = () => {
    if (statusRef.current !== 'paused') return
    deadlineRef.current = Date.now() + pausedSecondsRef.current * 1000
    workoutStartRef.current = Date.now()
    updateStatus('running')
    tick()
  }

  const reset = () => {
    deadlineRef.current = null
    workoutStartRef.current = null
    completionHandledRef.current = false
    lastCountdownSoundRef.current = null
    pausedSecondsRef.current = duration
    setDisplaySeconds(duration)
    setCountdownNumber(3)
    updateStatus('idle')
  }

  const chooseDuration = (nextDuration: Duration) => {
    if (statusRef.current !== 'idle' && statusRef.current !== 'complete') return
    setDuration(nextDuration)
    setDisplaySeconds(nextDuration)
    updateStatus('idle')
  }

  const todayDone = hasCompletedToday(records)
  const streak = calculateStreak(records)
  const latestRecords = records.slice(0, 5)
  const timerLabel = status === 'countdown' ? String(countdownNumber) : `${displaySeconds}`
  const helperText = status === 'countdown' ? '構えてください' : status === 'complete' ? '完了。ナイスプランク。' : '残り時間'

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">DAILY TRAINING</p>
          <h1>PLANK</h1>
        </div>
        <div className={`today-badge ${todayDone ? 'is-done' : ''}`} aria-label={todayDone ? '今日のトレーニングは完了' : '今日のトレーニングは未実施'}>
          <span className="status-dot" />
          {todayDone ? 'TODAY DONE' : 'TODAY'}
        </div>
      </header>

      <section className="duration-section" aria-label="トレーニング時間">
        <p className="section-label">時間を選ぶ</p>
        <div className="duration-picker">
          {DURATIONS.map((option) => (
            <button key={option} className={duration === option ? 'selected' : ''} onClick={() => chooseDuration(option)} disabled={status === 'countdown' || status === 'running' || status === 'paused'}>
              {option}<small>秒</small>
            </button>
          ))}
        </div>
      </section>

      <section className={`timer-section ${status}`} aria-live="polite">
        <p className="timer-helper">{helperText}</p>
        <div className="timer-orbit">
          <div className="timer-value">{timerLabel}<span>{status === 'countdown' ? '' : '秒'}</span></div>
        </div>
      </section>

      <section className="controls" aria-label="タイマー操作">
        {(status === 'idle' || status === 'complete') && <button className="primary-button" onClick={start}>開始</button>}
        {status === 'countdown' && <button className="secondary-button full" onClick={reset}>リセット</button>}
        {status === 'running' && <><button className="primary-button" onClick={pause}>一時停止</button><button className="secondary-button" onClick={reset}>リセット</button></>}
        {status === 'paused' && <><button className="primary-button" onClick={resume}>再開</button><button className="secondary-button" onClick={reset}>リセット</button></>}
      </section>

      <section className="summary-grid" aria-label="実施状況">
        <div className="summary-card"><p>今日の実施</p><strong>{todayDone ? '完了' : '未実施'}</strong></div>
        <div className="summary-card"><p>連続達成</p><strong>{streak}<span>日</span></strong></div>
      </section>

      <section className="history" aria-label="最近の実施履歴">
        <div className="history-heading"><h2>RECENT</h2><span>完了した記録のみ</span></div>
        {latestRecords.length === 0 ? <p className="empty-history">最初の1回を始めよう。</p> : <ul>{latestRecords.map((record) => <li key={record.id}><span>{formatDate(record.date)}</span><strong>{record.seconds}秒</strong><em>完了</em></li>)}</ul>}
      </section>
      <p className="privacy-note">記録はこの端末内にのみ保存されます。</p>
    </main>
  )
}

export default App
