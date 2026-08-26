import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'

let cached: string | null = null

export function resourcesDir(): string {
  if (cached) return cached
  const candidates = [
    join(app.getAppPath(), 'resources'),
    join(process.resourcesPath ?? '', 'app.asar.unpacked', 'resources'),
    join(process.resourcesPath ?? '', 'resources')
  ]
  cached = candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]
  return cached
}

export function resourcePath(...parts: string[]): string {
  return join(resourcesDir(), ...parts)
}
