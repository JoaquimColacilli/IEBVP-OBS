import { bcv_parser } from 'bible-passage-reference-parser/cjs/es_bcv_parser.js'
import type { Candidate, Fit, Passage, SearchResult } from '@shared/types'
import { loadBible, type Bible, type BibleBook } from './library'

const parser = new bcv_parser()

const nameIndexes = new Map<string, Map<string, BibleBook>>()
const osisIndexes = new Map<string, Map<string, BibleBook>>()

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .split('')
    .filter((char) => (char >= 'a' && char <= 'z') || (char >= '0' && char <= '9'))
    .join('')
}

function nameIndex(bible: Bible): Map<string, BibleBook> {
  let index = nameIndexes.get(bible.id)
  if (index) return index
  index = new Map()
  for (const book of bible.books) {
    for (const key of [book.id, book.name, ...book.abbrevs]) {
      const normalized = normalize(key)
      if (normalized && !index.has(normalized)) index.set(normalized, book)
    }
  }
  nameIndexes.set(bible.id, index)
  return index
}

function osisIndex(bible: Bible): Map<string, BibleBook> {
  let index = osisIndexes.get(bible.id)
  if (index) return index
  index = new Map(bible.books.map((book) => [book.osis, book]))
  osisIndexes.set(bible.id, index)
  return index
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
}

function findBook(bible: Bible, query: string): { book: BibleBook; rest: string[] } | null {
  const index = nameIndex(bible)
  const tokens = tokenize(query)
  for (let take = Math.min(3, tokens.length); take >= 1; take--) {
    const head = tokens.slice(0, take)
    if (head.some((token, position) => position > 0 && /^\d+$/.test(token))) continue
    const key = normalize(head.join(''))
    const direct = index.get(key)
    if (direct) return { book: direct, rest: tokens.slice(take) }
    const split = /^(.*?)(\d+)$/.exec(key)
    if (split && split[1]) {
      const book = index.get(split[1])
      if (book) return { book, rest: [split[2], ...tokens.slice(take)] }
    }
  }
  return null
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function fitFor(text: string): Fit {
  if (text.length <= 90) return 's'
  if (text.length <= 260) return 'm'
  if (text.length <= 620) return 'l'
  return 'xl'
}

function verseCount(book: BibleBook, chapter: number): number {
  return book.chapters[chapter - 1]?.length ?? 0
}

function buildPassage(
  bible: Bible,
  book: BibleBook,
  chapter: number,
  from: number,
  to: number
): Passage | null {
  const verses = book.chapters[chapter - 1]
  if (!verses) return null
  const picked: { number: number; text: string }[] = []
  for (let number = from; number <= to; number++) {
    const text = verses[number - 1]
    if (text) picked.push({ number, text })
  }
  if (!picked.length) return null
  const text = picked.map((verse) => verse.text).join(' ')
  const html =
    picked.length === 1
      ? escapeHtml(picked[0].text)
      : picked
          .map((verse) => `<span class="ov-num">${verse.number}</span>${escapeHtml(verse.text)}`)
          .join(' ')
  const reference = from === to ? `${book.name} ${chapter}:${from}` : `${book.name} ${chapter}:${from}-${to}`
  return {
    bookId: book.id,
    book: book.name,
    chapter,
    from,
    to,
    reference,
    version: bible.id,
    credit: bible.credit,
    text,
    html,
    fit: fitFor(text)
  }
}

function candidateFor(book: BibleBook, chapter: number, verse: number): Candidate | null {
  if (chapter < 1 || chapter > book.chapters.length) return null
  if (verse < 1 || verse > verseCount(book, chapter)) return null
  if (!book.chapters[chapter - 1][verse - 1]) return null
  return { reference: `${book.name} ${chapter}:${verse}`, query: `${book.name} ${chapter}:${verse}` }
}

function candidatesFor(book: BibleBook, numbers: number[]): Candidate[] {
  const found: Candidate[] = []
  const push = (candidate: Candidate | null): void => {
    if (candidate && !found.some((item) => item.reference === candidate.reference)) found.push(candidate)
  }
  const [first, second] = numbers
  if (first === undefined) return found
  const chapterOk = first >= 1 && first <= book.chapters.length
  if (second !== undefined && chapterOk) {
    const digits = String(second)
    if (digits.length > 1) {
      push(candidateFor(book, first, Number(digits.slice(1))))
      push(candidateFor(book, first, Number(digits.slice(0, -1))))
      for (let cut = digits.length - 1; cut > 0; cut--) {
        push(candidateFor(book, Number(digits.slice(0, cut)), Number(digits.slice(cut))))
      }
    }
  } else {
    const digits = String(first)
    const verse = second ?? 1
    for (let cut = digits.length - 1; cut > 0; cut--) {
      push(candidateFor(book, Number(digits.slice(0, cut)), verse))
    }
    for (let cut = 1; cut < digits.length; cut++) {
      push(candidateFor(book, Number(digits.slice(cut)), verse))
    }
    if (second === undefined) push(candidateFor(book, 1, first))
  }
  return found.slice(0, 3)
}

function miss(query: string, detail: string, candidates: Candidate[] = []): SearchResult {
  return { ok: false, query, title: `No encontramos «${query}»`, detail, candidates }
}

function diagnose(bible: Bible, query: string): SearchResult {
  const match = findBook(bible, query)
  if (!match) return miss(query, 'No reconocimos el libro de esa referencia.')
  const { book, rest } = match
  const numbers = rest.filter((token) => /^\d+$/.test(token)).map(Number)
  if (!numbers.length) {
    return miss(query, `${book.name} tiene ${book.chapters.length} capítulos: agregá capítulo y versículo.`)
  }
  const [chapter, verse] = numbers
  if (chapter < 1 || chapter > book.chapters.length) {
    return miss(query, `${book.name} tiene ${book.chapters.length} capítulos.`, candidatesFor(book, numbers))
  }
  if (verse === undefined) {
    return miss(query, `${book.name} ${chapter} tiene ${verseCount(book, chapter)} versículos.`)
  }
  return miss(
    query,
    `${book.name} tiene ${verseCount(book, chapter)} versículos en el capítulo ${chapter}.`,
    candidatesFor(book, numbers)
  )
}

export async function search(query: string, versionId: string): Promise<SearchResult> {
  const bible = await loadBible(versionId)
  const trimmed = query.trim()
  if (!trimmed) return miss(query, 'Escribí una referencia y presioná Enter.')

  const entity = parser.parse(trimmed).parsed_entities()[0]?.entities?.[0]
  if (entity?.start && entity.end) {
    const book = osisIndex(bible).get(entity.start.b)
    if (book) {
      if (entity.end.c !== entity.start.c) {
        return miss(query, 'Elegí un rango dentro de un mismo capítulo.')
      }
      const passage = buildPassage(bible, book, entity.start.c, entity.start.v, entity.end.v)
      if (passage) return { ok: true, passage }
    }
  }
  return diagnose(bible, trimmed)
}
