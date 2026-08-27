import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { BookInfo } from '@shared/types'
import { completeBook, matchingBooks } from '../lib/autocomplete'

const MAX_SUGGESTIONS = 7

interface Props {
  query: string
  books: BookInfo[]
  inputRef: RefObject<HTMLInputElement | null>
  placeholder: string
  onQuery: (value: string) => void
  onSubmit: () => void
}

export default function Buscador(props: Props): React.JSX.Element {
  const { query, books, inputRef } = props
  const [focused, setFocused] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const [closedList, setClosedList] = useState(false)
  const typedRef = useRef(query)
  const pushedRef = useRef(query)
  const absorbRef = useRef('')

  const suggestions = useMemo(
    () => matchingBooks(query, books).slice(0, MAX_SUGGESTIONS),
    [books, query]
  )
  const listOpen = focused && !closedList && suggestions.length > 0

  useEffect(() => {
    if (query !== pushedRef.current) {
      typedRef.current = query
      absorbRef.current = ''
    }
  }, [query])

  const caretToEnd = (text: string): void => {
    queueMicrotask(() => {
      const node = inputRef.current
      if (!node) return
      if (node.value !== text) node.value = text
      node.setSelectionRange(text.length, text.length)
    })
  }

  const push = (text: string): void => {
    typedRef.current = text
    pushedRef.current = text
    props.onQuery(text)
  }

  const change = (value: string): void => {
    const previous = typedRef.current
    const appended = value.length === previous.length + 1 && value.startsWith(previous)
    const inserted = appended ? value[previous.length] : ''

    if (
      appended &&
      inserted &&
      absorbRef.current.toLowerCase().startsWith(inserted.toLowerCase())
    ) {
      absorbRef.current = absorbRef.current.slice(1)
      push(previous)
      caretToEnd(previous)
      return
    }
    if (appended && !absorbRef.current && inserted === ' ' && previous.endsWith(' ')) {
      push(previous)
      caretToEnd(previous)
      return
    }

    absorbRef.current = ''
    setClosedList(false)
    setHighlight(-1)

    if (value.length > previous.length) {
      const completion = completeBook(value, books)
      if (completion) {
        absorbRef.current = completion.slice(value.length)
        const next = `${completion} `
        push(next)
        caretToEnd(next)
        return
      }
    }
    push(value)
    if (value === query) caretToEnd(value)
  }

  const choose = (name: string): void => {
    absorbRef.current = ''
    setClosedList(true)
    setHighlight(-1)
    const next = `${name} `
    push(next)
    caretToEnd(next)
    inputRef.current?.focus()
  }

  return (
    <div className="search-field">
      <div className={focused ? 'field is-focus' : 'field'}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={props.placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onChange={(event) => change(event.target.value)}
          onKeyDown={(event) => {
            if (listOpen) {
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault()
                event.stopPropagation()
                const delta = event.key === 'ArrowDown' ? 1 : -1
                setHighlight((current) => {
                  const next = current + delta
                  if (next < 0) return suggestions.length - 1
                  if (next >= suggestions.length) return 0
                  return next
                })
                return
              }
              if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                setClosedList(true)
                return
              }
              if (event.key === 'Enter' && highlight >= 0) {
                event.preventDefault()
                event.stopPropagation()
                choose(suggestions[highlight].name)
                return
              }
            }
            if (event.key === 'Enter' && !event.ctrlKey) {
              event.preventDefault()
              setClosedList(true)
              props.onSubmit()
            }
          }}
        />
        <span className="ret">Enter</span>
      </div>
      {listOpen && (
        <div className="suggest">
          {suggestions.map((book, index) => (
            <button
              className={index === highlight ? 'suggest-item is-on' : 'suggest-item'}
              type="button"
              key={book.id}
              onMouseEnter={() => setHighlight(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(book.name)}
            >
              <span>{book.name}</span>
              <span className="browser-count">{book.verses.length} cap.</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
