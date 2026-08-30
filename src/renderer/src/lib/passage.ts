import type { BookInfo, Passage } from '@shared/types'

export function chapterVerses(books: BookInfo[], passage: Passage): number {
  const book = books.find((item) => item.id === passage.bookId)
  return book?.verses[passage.chapter - 1] ?? 0
}

function referenceOf(passage: Passage, from: number, to: number): string {
  return `${passage.book} ${passage.chapter}:${from === to ? from : `${from}-${to}`}`
}

export function neighbourVerse(passage: Passage, total: number, delta: -1 | 1): string | null {
  if (total <= 0) return null
  const span = Math.max(1, passage.to - passage.from + 1)
  if (delta > 0) {
    const from = passage.to + 1
    if (from > total) return null
    return referenceOf(passage, from, Math.min(total, from + span - 1))
  }
  const to = passage.from - 1
  if (to < 1) return null
  return referenceOf(passage, Math.max(1, to - span + 1), to)
}
