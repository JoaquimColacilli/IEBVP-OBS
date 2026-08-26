import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'resources', 'fonts')

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const CSS_URL =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Spectral:wght@400&display=swap'
const SUBSETS = ['latin', 'latin-ext']

function parse(css) {
  const faces = []
  const blocks = css.split('/*').slice(1)
  for (const block of blocks) {
    const subset = block.slice(0, block.indexOf('*/')).trim()
    if (!SUBSETS.includes(subset)) continue
    const family = /font-family:\s*'([^']+)'/.exec(block)?.[1]
    const weight = /font-weight:\s*(\d+)/.exec(block)?.[1]
    const style = /font-style:\s*(\w+)/.exec(block)?.[1] ?? 'normal'
    const url = /src:\s*url\(([^)]+)\)/.exec(block)?.[1]
    const range = /unicode-range:\s*([^;]+);/.exec(block)?.[1]
    if (!family || !weight || !url || !range) continue
    const slug = family.toLowerCase().replace(/\s+/g, '-')
    faces.push({
      family,
      weight,
      style,
      url,
      range,
      subset,
      file: `${slug}-${weight}-${subset}.woff2`
    })
  }
  return faces
}

const written = new Map()

async function save(face) {
  const response = await fetch(face.url, { headers: { 'user-agent': UA } })
  if (!response.ok) throw new Error(`${face.url} respondió ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  const hash = createHash('sha1').update(bytes).digest('hex')
  const existing = written.get(hash)
  if (existing) {
    face.file = existing
    return false
  }
  written.set(hash, face.file)
  await writeFile(join(OUT, face.file), bytes)
  return true
}

function stylesheet(faces) {
  return (
    faces
      .map((face) =>
        [
          '@font-face{',
          `font-family:'${face.family}';`,
          `font-style:${face.style};`,
          `font-weight:${face.weight};`,
          'font-display:swap;',
          `src:url('./${face.file}') format('woff2');`,
          `unicode-range:${face.range};`,
          '}'
        ].join('')
      )
      .join('\n') + '\n'
  )
}

await mkdir(OUT, { recursive: true })
const response = await fetch(CSS_URL, { headers: { 'user-agent': UA } })
if (!response.ok) throw new Error(`${CSS_URL} respondió ${response.status}`)
const faces = parse(await response.text())
if (!faces.length) throw new Error('Google Fonts no devolvió ninguna @font-face utilizable')
let files = 0
for (const face of faces) if (await save(face)) files++
await writeFile(join(OUT, 'fonts.css'), stylesheet(faces), 'utf8')
console.log(`${faces.length} @font-face y ${files} archivos woff2 en resources/fonts`)
