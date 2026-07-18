export function prepareAudio(context: AudioContext | null): AudioContext | null {
  try {
    const nextContext = context ?? new AudioContext()
    void nextContext.resume().catch(() => undefined)
    return nextContext
  } catch {
    return null
  }
}

function playTone(context: AudioContext, frequency: number, startAt: number, duration: number, volume: number, type: OscillatorType = 'sine'): void {
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, startAt)
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  oscillator.connect(gain).connect(context.destination)
  oscillator.start(startAt)
  oscillator.stop(startAt + duration + 0.02)
}

export function playCountdownFeedback(context: AudioContext | null, count: number): void {
  try {
    if (context?.state === 'suspended') void context.resume().catch(() => undefined)
    if (!context) return

    // A slightly higher cue on "1" makes the start point easy to catch.
    playTone(context, count === 1 ? 880 : 660, context.currentTime, 0.1, 0.07, 'square')
  } catch {
    // Feedback is optional; never let it interrupt the timer.
  }
}

export function playCompletionFeedback(context: AudioContext | null): void {
  try {
    if (context?.state === 'suspended') void context.resume().catch(() => undefined)
    if (context) {
      const startAt = context.currentTime
      // A distinct three-note chime is more noticeable than the previous single sweep.
      playTone(context, 523.25, startAt, 0.16, 0.11, 'sine')
      playTone(context, 659.25, startAt + 0.18, 0.16, 0.11, 'sine')
      playTone(context, 783.99, startAt + 0.36, 0.42, 0.13, 'sine')
    }
  } catch {
    // Feedback is optional; never let it interrupt the timer.
  }

  try {
    if ('vibrate' in navigator) navigator.vibrate?.([120, 70, 180])
  } catch {
    // iOS Safari and some browsers do not expose vibration.
  }
}
