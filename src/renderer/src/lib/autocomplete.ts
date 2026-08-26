import type { BookInfo, Fit, Passage } from '@shared/types'

const SIZES: Record<Fit, number> = { s: 88, m: 72, l: 52, xl: 42 }

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .split('')
    .filter((char) => (char >= 'a' && char <= 'z') || (char >= '0' && char <= '9'))
    .join('')
}

export function matchingBooks(text: string, books: BookInfo[]): BookInfo[] {
  const typed = normalize(text)
  if (!typed) return []
  const matches = books.filter((book) => normalize(book.name).startsWith(typed))
  if (matches.length === 1 && normalize(matches[0].name) === typed) return []
  return matches
}

export function completeBook(text: string, books: BookInfo[]): string | null {
  const matches = matchingBooks(text, books)
  if (matches.length !== 1) return null
  const book = matches[0]
  if (normalize(text).length < 2 || book.name.length <= text.length) return null
  return book.name
}

export function fitForLength(length: number): Fit {
  if (length <= 90) return 's'
  if (length <= 260) return 'm'
  if (length <= 620) return 'l'
  return 'xl'
}

export function lastVerseThatFits(
  passage: Passage,
  lines: number,
  maxLines: number
): number | null {
  if (lines <= 0 || passage.verseLengths.length < 2) return null
  const charsPerLine = passage.text.length / lines
  const size = SIZES[passage.fit]
  let total = 0
  let best = 0
  for (let count = 1; count <= passage.verseLengths.length; count++) {
    total += passage.verseLengths[count - 1] + 1
    const length = total - 1
    const perLine = (charsPerLine * size) / SIZES[fitForLength(length)]
    if (Math.ceil(length / perLine) > maxLines) break
    best = count
  }
  if (!best || best >= passage.verseLengths.length) return null
  return passage.from + best - 1
}

export function splitLines(raw: string): string[] {
  return raw
    .split(/[\n\r;]+/)
    .map((line) => line.replace(/^\s*(?:[-*•–—]\s+|\d+[.)]\s+)/, '').trim())
    .filter(Boolean)
}
