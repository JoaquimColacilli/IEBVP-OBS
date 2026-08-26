import { useState } from 'react'
import type { BookInfo } from '@shared/types'
import { normalize } from '../lib/autocomplete'

interface Props {
  books: BookInfo[]
  onPick: (query: string) => void
  onClose: () => void
}

export default function BookBrowser({ books, onPick, onClose }: Props): React.JSX.Element {
  const [book, setBook] = useState<BookInfo | null>(null)
  const [chapter, setChapter] = useState(0)
  const [filter, setFilter] = useState('')
  const [range, setRange] = useState(false)
  const [anchor, setAnchor] = useState(0)
  const [hover, setHover] = useState(0)

  const typed = normalize(filter)
  const visible = typed ? books.filter((item) => normalize(item.name).includes(typed)) : books

  const reset = (): void => {
    setAnchor(0)
    setHover(0)
  }

  const back = (): void => {
    reset()
    if (chapter) setChapter(0)
    else setBook(null)
  }

  const pickVerse = (verse: number, withShift: boolean): void => {
    if (!book) return
    if (!range && !withShift) {
      onPick(`${book.name} ${chapter}:${verse}`)
      return
    }
    if (!anchor) {
      setAnchor(verse)
      setHover(verse)
      return
    }
    const from = Math.min(anchor, verse)
    const to = Math.max(anchor, verse)
    reset()
    onPick(
      from === to ? `${book.name} ${chapter}:${from}` : `${book.name} ${chapter}:${from}-${to}`
    )
  }

  const marked = (verse: number): boolean => {
    if (!anchor) return false
    const edge = hover || anchor
    return verse >= Math.min(anchor, edge) && verse <= Math.max(anchor, edge)
  }

  const title = book ? (chapter ? `${book.name} ${chapter}` : book.name) : 'Libros'

  return (
    <div className="browser">
      <div className="browser-h">
        {book && (
          <button className="browser-icon" type="button" title="Atrás" onClick={back}>
            &#8592;
          </button>
        )}
        <span className="browser-title">{title}</span>
        <span className="spacer"></span>
        <button className="browser-icon" type="button" title="Cerrar" onClick={onClose}>
          &#10005;
        </button>
      </div>

      {!book && (
        <input
          className="browser-filter"
          type="text"
          value={filter}
          autoFocus
          placeholder="Filtrar libro"
          onChange={(event) => setFilter(event.target.value)}
          onKeyDown={(event) => event.stopPropagation()}
        />
      )}

      {book && chapter > 0 && (
        <div className="browser-mode">
          <button
            className={range ? 'switch is-on' : 'switch'}
            type="button"
            role="switch"
            aria-checked={range}
            onClick={() => {
              reset()
              setRange((on) => !on)
            }}
          >
            <span className="switch-track">
              <span className="switch-knob"></span>
            </span>
            Rango
          </button>
          <span className="browser-hint">
            {range
              ? anchor
                ? `Desde ${anchor} · elegí el final`
                : 'Elegí el primer versículo'
              : 'Shift + clic también'}
          </span>
        </div>
      )}

      <div className="browser-body">
        {!book &&
          visible.map((item) => (
            <button
              className="browser-book"
              type="button"
              key={item.id}
              onClick={() => {
                setBook(item)
                setChapter(0)
              }}
            >
              <span>{item.name}</span>
              <span className="browser-count">{item.verses.length}</span>
            </button>
          ))}

        {book && !chapter && (
          <div className="browser-grid">
            {book.verses.map((_, index) => (
              <button
                className="browser-num"
                type="button"
                key={index}
                onClick={() => setChapter(index + 1)}
              >
                {index + 1}
              </button>
            ))}
          </div>
        )}

        {book && chapter > 0 && (
          <>
            <button
              className="browser-whole"
              type="button"
              onClick={() => onPick(`${book.name} ${chapter}`)}
            >
              Capítulo completo · {book.verses[chapter - 1]} versículos
            </button>
            <div className="browser-grid" onMouseLeave={() => setHover(0)}>
              {Array.from({ length: book.verses[chapter - 1] }, (_, index) => {
                const verse = index + 1
                const classes = ['browser-num']
                if (marked(verse)) classes.push('is-marked')
                if (anchor === verse) classes.push('is-anchor')
                return (
                  <button
                    className={classes.join(' ')}
                    type="button"
                    key={verse}
                    onMouseEnter={() => anchor && setHover(verse)}
                    onClick={(event) => pickVerse(verse, event.shiftKey)}
                  >
                    {verse}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {anchor > 0 && book && (
        <div className="browser-foot">
          <span className="chip">
            {book.name} {chapter}:{Math.min(anchor, hover || anchor)}
            {(hover || anchor) !== anchor && `-${Math.max(anchor, hover)}`}
          </span>
          <span className="spacer"></span>
          <button className="link" type="button" onClick={reset}>
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}
