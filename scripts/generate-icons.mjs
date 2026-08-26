import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import pngToIco from 'png-to-ico'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MASTER = join(ROOT, 'resources', 'icon.svg')
const OUT = join(ROOT, 'resources', 'icons')
const DENSITY = 384
const SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024]
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]

async function render(svg, size, target) {
  await sharp(svg, { density: DENSITY })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(target)
}

await mkdir(OUT, { recursive: true })
const svg = await readFile(MASTER)

for (const size of SIZES) await render(svg, size, join(OUT, `icon-${size}.png`))
await render(svg, 1024, join(ROOT, 'resources', 'icon.png'))

const ico = await pngToIco(ICO_SIZES.map((size) => join(OUT, `icon-${size}.png`)))
await writeFile(join(ROOT, 'resources', 'icon.ico'), ico)

console.log(`${SIZES.length} png en resources/icons, icon.png y icon.ico (${ICO_SIZES.join(', ')})`)
