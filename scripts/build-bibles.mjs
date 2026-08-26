import { createWriteStream } from 'node:fs'
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { Readable } from 'node:stream'
import { BOOKS } from './books.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE = join(ROOT, 'scripts', '.cache')
const OUT = join(ROOT, 'resources', 'bibles')
const SCHEMA = 1

const SOURCES = [
  {
    id: 'RVR1960',
    name: 'Reina-Valera 1960',
    publisher: 'Sociedades Bíblicas Unidas',
    credit: 'RVR1960 © Sociedades Bíblicas Unidas',
    format: 'mrk214',
    file: 'RVR1960_vid_149.json',
    url: 'https://mrk214.github.io/snapshots/es___spa___spa/RVR1960_vid_149.json',
    source: 'https://github.com/mrk214/bible-data-es-spa'
  },
  {
    id: 'NVI',
    name: 'Nueva Versión Internacional',
    publisher: 'Biblica',
    credit: 'NVI © Biblica, Inc.',
    format: 'mrk214',
    file: 'NVI_vid_128.json',
    url: 'https://mrk214.github.io/snapshots/es___spa___spa/NVI_vid_128.json',
    source: 'https://github.com/mrk214/bible-data-es-spa'
  },
  {
    id: 'RVR1909',
    name: 'Reina-Valera 1909',
    publisher: 'dominio público',
    credit: 'RVR1909 · Dominio público',
    format: 'getbible',
    file: 'valera.json',
    url: 'https://api.getbible.net/v2/valera.json',
    source: 'https://api.getbible.net/v2/valera.json'
  }
]

function clean(text) {
  return text.replace(/\s+/g, ' ').trim()
}

async function download(source) {
  const target = join(CACHE, source.file)
  try {
    await stat(target)
    return target
  } catch {
    // no cacheado
  }
  process.stdout.write(`bajando ${source.id} … `)
  const response = await fetch(source.url)
  if (!response.ok) throw new Error(`${source.url} respondió ${response.status}`)
  await pipeline(Readable.fromWeb(response.body), createWriteStream(target))
  process.stdout.write('ok\n')
  return target
}

function emptyChapters() {
  return BOOKS.map((book) => ({ ...book, chapters: [] }))
}

function place(verses, verseNumber, text) {
  while (verses.length < verseNumber) verses.push('')
  const previous = verses[verseNumber - 1]
  verses[verseNumber - 1] = previous ? `${previous} ${text}` : text
}

function fromMrk214(raw) {
  const books = emptyChapters()
  const byId = new Map(books.map((book) => [book.id, book]))
  for (const sourceBook of raw.books) {
    const book = byId.get(sourceBook.book_usfm)
    if (!book) continue
    for (const chapter of sourceBook.chapters) {
      const number = Number(chapter.chapter_usfm.split('.').pop())
      const verses = []
      for (const item of chapter.items) {
        if (item.type !== 'verse') continue
        const verse = item.verse_numbers[0]
        if (!verse) continue
        place(verses, verse, clean(item.lines.join(' ')))
      }
      book.chapters[number - 1] = verses
    }
  }
  return books
}

function fromGetbible(raw) {
  const books = emptyChapters()
  for (const sourceBook of raw.books) {
    const book = books[sourceBook.nr - 1]
    if (!book) continue
    for (const chapter of sourceBook.chapters) {
      const verses = []
      for (const verse of chapter.verses) place(verses, verse.verse, clean(verse.text))
      book.chapters[chapter.chapter - 1] = verses
    }
  }
  return books
}

function check(id, books) {
  const problems = []
  for (const book of books) {
    if (!book.chapters.length) problems.push(`${book.id} sin capítulos`)
    for (let index = 0; index < book.chapters.length; index++) {
      const chapter = book.chapters[index]
      if (!chapter || !chapter.length) problems.push(`${book.id} ${index + 1} vacío`)
    }
  }
  if (problems.length) throw new Error(`${id}: ${problems.slice(0, 5).join(', ')}`)
}

async function build(source) {
  const path = await download(source)
  const raw = JSON.parse(await readFile(path, 'utf8'))
  const books = source.format === 'mrk214' ? fromMrk214(raw) : fromGetbible(raw)
  check(source.id, books)
  const verses = books.reduce(
    (total, book) => total + book.chapters.reduce((sum, chapter) => sum + chapter.filter(Boolean).length, 0),
    0
  )
  const payload = {
    schema: SCHEMA,
    id: source.id,
    name: source.name,
    publisher: source.publisher,
    credit: source.credit,
    source: source.source,
    books
  }
  await writeFile(join(OUT, `${source.id}.json`), JSON.stringify(payload), 'utf8')
  console.log(`${source.id}: ${books.length} libros, ${verses} versículos`)
  return {
    id: source.id,
    name: source.name,
    publisher: source.publisher,
    credit: source.credit,
    source: source.source,
    file: `${source.id}.json`,
    books: books.length,
    verses
  }
}

await mkdir(CACHE, { recursive: true })
await mkdir(OUT, { recursive: true })

const versions = []
for (const source of SOURCES) versions.push(await build(source))

await writeFile(join(OUT, 'index.json'), JSON.stringify({ schema: SCHEMA, versions }, null, 2) + '\n', 'utf8')
console.log(`index.json: ${versions.map((version) => version.id).join(', ')}`)
