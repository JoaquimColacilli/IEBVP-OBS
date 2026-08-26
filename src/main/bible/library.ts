import { readFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { BookInfo, VersionInfo } from '@shared/types'

export interface BibleBook {
  id: string
  osis: string
  name: string
  abbrevs: string[]
  chapters: string[][]
}

export interface Bible {
  schema: number
  id: string
  name: string
  publisher: string
  credit: string
  source: string
  books: BibleBook[]
}

interface Index {
  schema: number
  versions: (VersionInfo & { file: string })[]
}

let dir = ''
let index: Index | null = null
const loaded = new Map<string, Bible>()
const loading = new Map<string, Promise<Bible>>()

export function setBiblesDir(path: string): void {
  dir = path
  index = null
  loaded.clear()
  loading.clear()
}

function getIndex(): Index {
  if (!index) index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')) as Index
  return index
}

export function listVersions(): VersionInfo[] {
  return getIndex().versions.map((version) => ({
    id: version.id,
    name: version.name,
    publisher: version.publisher,
    credit: version.credit,
    books: version.books,
    verses: version.verses
  }))
}

export function hasVersion(id: string): boolean {
  return getIndex().versions.some((version) => version.id === id)
}

export function defaultVersion(): string {
  return getIndex().versions[0].id
}

export async function listBooks(id: string): Promise<BookInfo[]> {
  const bible = await loadBible(id)
  return bible.books.map((book) => ({
    id: book.id,
    name: book.name,
    abbrevs: book.abbrevs,
    chapters: book.chapters.length
  }))
}

export async function loadBible(id: string): Promise<Bible> {
  const cached = loaded.get(id)
  if (cached) return cached
  const pending = loading.get(id)
  if (pending) return pending
  const entry = getIndex().versions.find((version) => version.id === id)
  if (!entry) throw new Error(`La versión ${id} no está instalada`)
  const task = readFile(join(dir, entry.file), 'utf8').then((raw) => {
    const bible = JSON.parse(raw) as Bible
    loaded.set(id, bible)
    loading.delete(id)
    return bible
  })
  loading.set(id, task)
  return task
}
