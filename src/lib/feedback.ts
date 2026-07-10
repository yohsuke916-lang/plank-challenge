export function prepareAudio(context: AudioContext | null): AudioContext | null {
  try {
    const nextContext = context ?? new AudioContext()
    void nextContext.resume().catch(() => undefined)
    return nextContext
  } catch {
    return null
  }
}

export function playCompletionFeedback(context: AudioContext | null): void {
  try {
    if (context?.state === 'suspended') void context.resume().catch(() => undefined)
    if (context) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(660, context.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.22)
      gain.gain.setValueAtTime(0.0001, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.13, context.currentTime + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.32)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.34)
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
