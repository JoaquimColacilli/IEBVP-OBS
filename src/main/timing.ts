import { app } from 'electron'

export interface Track {
  step(name: string): void
  end(): void
}

const IDLE: Track = { step: () => {}, end: () => {} }

function millis(from: bigint, to: bigint): string {
  return `${(Number(to - from) / 1e6).toFixed(2)} ms`
}

export function track(label: string): Track {
  if (app.isPackaged) return IDLE
  const start = process.hrtime.bigint()
  const steps: string[] = []
  let previous = start
  return {
    step(name) {
      const now = process.hrtime.bigint()
      steps.push(`${name} ${millis(previous, now)}`)
      previous = now
    },
    end() {
      const now = process.hrtime.bigint()
      steps.push(`total ${millis(start, now)}`)
      console.log(`[tiempo] ${label} · ${steps.join(' · ')}`)
    }
  }
}
