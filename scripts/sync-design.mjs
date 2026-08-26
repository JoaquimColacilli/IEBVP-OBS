import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const FROM = join(ROOT, 'design-reference', 'tokens.css')
const TO = join(ROOT, 'resources', 'tokens.css')

await mkdir(dirname(TO), { recursive: true })
await copyFile(FROM, TO)
console.log('resources/tokens.css actualizado desde design-reference/tokens.css')
