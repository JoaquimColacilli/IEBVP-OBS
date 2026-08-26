import type { BookInfo } from '@shared/types'

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .split('')
    .filter((char) => (char >= 'a' && char <= 'z') || (char >= '0' && char <= '9'))
    .join('')
}

export function completeBook(text: string, books: BookInfo[]): string | null {
  const typed = normalize(text)
  if (typed.length < 2) return null
  let found: BookInfo | null = null
  for (const book of books) {
    const name = normalize(book.name)
    if (!name.startsWith(typed)) continue
    if (found) return null
    if (name === typed) return null
    found = book
  }
  if (!found || found.name.length <= text.length) return null
  return found.name
}

export function splitLines(raw: string): string[] {
  return raw
    .split(/[\n\r;]+/)
    .map((line) => line.replace(/^\s*(?:[-*•–—]\s+|\d+[.)]\s+)/, '').trim())
    .filter(Boolean)
}
