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

  const typed = normalize(filter)
  const visible = typed ? books.filter((item) => normalize(item.name).includes(typed)) : books

  const back = (): void => {
    if (chapter) setChapter(0)
    else setBook(null)
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
            <div className="browser-grid">
              {Array.from({ length: book.verses[chapter - 1] }, (_, index) => (
                <button
                  className="browser-num"
                  type="button"
                  key={index}
                  onClick={() => onPick(`${book.name} ${chapter}:${index + 1}`)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
