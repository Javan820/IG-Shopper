'use client'

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react'
import { Store } from 'lucide-react'

interface TrackedMention {
  displayStart: number // position of '@' in display text
  displayEnd: number   // position after last char of name (exclusive)
  uuid: string
  name: string
}

interface MentionResult {
  type: 'user' | 'shop'
  id: string
  display_name: string
  avatar_url: string | null
}

interface MentionTextareaProps {
  name: string
  value: string
  onValueChange: (value: string) => void
  rows?: number
  maxLength?: number
  placeholder?: string
  required?: boolean
  className?: string
}

// Renders @mentions in color based on tracked position data.
// display matches textarea content exactly → caret aligns with overlay.
function renderOverlay(display: string, mentions: TrackedMention[]): React.ReactNode[] {
  const sorted = [...mentions].sort((a, b) => a.displayStart - b.displayStart)
  const parts: React.ReactNode[] = []
  let pos = 0
  for (const m of sorted) {
    if (m.displayStart > pos) parts.push(display.slice(pos, m.displayStart))
    parts.push(
      <span key={m.displayStart} className="text-primary">
        @{m.name}
      </span>,
    )
    pos = m.displayEnd
  }
  if (pos < display.length) parts.push(display.slice(pos))
  return parts
}

// Converts display text + mention positions → encoded form for server storage.
// Users: @[uuid:Name], Shops: @ig_handle (already in display, no encoding needed)
function computeEncodedValue(display: string, mentions: TrackedMention[]): string {
  const sorted = [...mentions].sort((a, b) => a.displayStart - b.displayStart)
  let result = ''
  let pos = 0
  for (const m of sorted) {
    result += display.slice(pos, m.displayStart)
    result += `@[${m.uuid}:${m.name}]`
    pos = m.displayEnd
  }
  result += display.slice(pos)
  return result
}

// Adjusts mention positions when text is edited.
// Finds the edit range (common prefix/suffix) to handle all edit types including paste-replace.
function adjustMentions(
  oldDisplay: string,
  newDisplay: string,
  mentions: TrackedMention[],
): TrackedMention[] {
  let prefixLen = 0
  while (
    prefixLen < Math.min(oldDisplay.length, newDisplay.length) &&
    oldDisplay[prefixLen] === newDisplay[prefixLen]
  ) prefixLen++

  let suffixLen = 0
  while (
    suffixLen < Math.min(oldDisplay.length - prefixLen, newDisplay.length - prefixLen) &&
    oldDisplay[oldDisplay.length - 1 - suffixLen] === newDisplay[newDisplay.length - 1 - suffixLen]
  ) suffixLen++

  const delStart = prefixLen
  const delEnd = oldDisplay.length - suffixLen   // deleted range in old string
  const insEnd = newDisplay.length - suffixLen   // inserted range end in new string
  const netChange = (insEnd - prefixLen) - (delEnd - delStart)

  return mentions
    .map((m) => {
      if (delStart < m.displayEnd && delEnd > m.displayStart) return null // overlaps: invalidate
      if (delEnd <= m.displayStart) return { ...m, displayStart: m.displayStart + netChange, displayEnd: m.displayEnd + netChange }
      return m
    })
    .filter((m): m is TrackedMention => m !== null)
}

export function MentionTextarea({
  name,
  value,
  onValueChange,
  rows = 3,
  maxLength,
  placeholder,
  required,
  className,
}: MentionTextareaProps) {
  const [mentions, setMentions] = useState<TrackedMention[]>([])
  const [results, setResults] = useState<MentionResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [mentionStart, setMentionStart] = useState(-1)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear tracked mentions when parent clears the value (after form submit)
  useEffect(() => {
    if (value === '') setMentions([])
  }, [value])

  useLayoutEffect(() => {
    if (!textareaRef.current || !overlayRef.current) return
    const s = getComputedStyle(textareaRef.current)
    overlayRef.current.style.padding = s.padding
    overlayRef.current.style.lineHeight = s.lineHeight
    overlayRef.current.style.fontSize = s.fontSize
    overlayRef.current.style.fontFamily = s.fontFamily
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newDisplay = e.target.value
      setMentions((prev) => adjustMentions(value, newDisplay, prev))
      onValueChange(newDisplay)

      const cursor = e.target.selectionStart
      const before = newDisplay.slice(0, cursor)
      const mentionMatch = before.match(/@([a-zA-Z0-9._一-鿿]*)$/)

      if (mentionMatch) {
        const q = mentionMatch[1]
        setMentionStart(cursor - mentionMatch[0].length)
        if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current)
        fetchTimeoutRef.current = setTimeout(() => {
          if (q.length < 1) { setResults([]); setShowDropdown(false); return }
          fetch(`/api/profiles/search?q=${encodeURIComponent(q)}`)
            .then((r) => r.json())
            .then((data) => {
              setResults(data.results ?? [])
              setShowDropdown((data.results ?? []).length > 0)
            })
            .catch(() => { setResults([]); setShowDropdown(false) })
        }, 200)
      } else {
        setShowDropdown(false)
        setMentionStart(-1)
        setResults([])
      }
    },
    [value, onValueChange],
  )

  const selectResult = useCallback(
    (result: MentionResult) => {
      const textarea = textareaRef.current
      if (!textarea || mentionStart === -1) return

      const cursor = textarea.selectionStart
      const before = value.slice(0, mentionStart)
      const after = value.slice(cursor)

      // For users: insert @DisplayName; for shops: insert @ig_handle (result.id)
      const insertedName = result.type === 'user' ? result.display_name : result.id
      const displayInsert = `@${insertedName} `
      const newDisplay = before + displayInsert + after

      if (result.type === 'user') {
        const mention: TrackedMention = {
          displayStart: mentionStart,
          displayEnd: mentionStart + 1 + insertedName.length,
          uuid: result.id,
          name: insertedName,
        }
        const shift = displayInsert.length - (cursor - mentionStart)
        const updated = mentions
          .filter((m) => m.displayEnd <= mentionStart || m.displayStart >= cursor)
          .map((m) =>
            m.displayStart >= cursor
              ? { ...m, displayStart: m.displayStart + shift, displayEnd: m.displayEnd + shift }
              : m,
          )
        setMentions([...updated, mention])
      }
      // shops: @ig_handle is plain text — MentionText.tsx parses it without uuid tracking

      onValueChange(newDisplay)
      setShowDropdown(false)
      setMentionStart(-1)
      setResults([])

      requestAnimationFrame(() => {
        const newPos = mentionStart + displayInsert.length
        textarea.setSelectionRange(newPos, newPos)
        textarea.focus()
      })
    },
    [value, mentions, mentionStart, onValueChange],
  )

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (dropdownRef.current && !dropdownRef.current.contains(target)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    return () => { if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current) }
  }, [])

  return (
    <div>
      {/*
        Hidden input must appear before the textarea in DOM order.
        formData.get(name) returns the first matching entry, so the server
        action receives the encoded value (with @[uuid:Name]) not the display text.
      */}
      <input type="hidden" name={name} value={computeEncodedValue(value, mentions)} />

      <div className="relative">
        {/*
          Overlay renders @mentions in color.
          Because display text === textarea text (no uuid inflation),
          the caret position in the transparent textarea aligns exactly with the overlay.
        */}
        <div
          ref={overlayRef}
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-words"
        >
          {renderOverlay(value, mentions)}
        </div>

        <textarea
          ref={textareaRef}
          name={name}
          value={value}
          onChange={handleChange}
          rows={rows}
          maxLength={maxLength}
          placeholder={placeholder}
          required={required}
          className={className}
          style={{ color: value ? 'transparent' : undefined, caretColor: 'rgba(0,0,0,0.85)' }}
          onScroll={() => {
            if (overlayRef.current && textareaRef.current) {
              overlayRef.current.scrollTop = textareaRef.current.scrollTop
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowDropdown(false)
          }}
        />

        {showDropdown && results.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute left-0 top-full z-30 mt-1 w-72 overflow-hidden rounded-xl border bg-white shadow-xl"
          >
            {results.map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  selectResult(result)
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
              >
                {result.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={result.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
                ) : result.type === 'shop' ? (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100">
                    <Store className="h-5 w-5 text-orange-500" />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    {(result.display_name?.[0] ?? '?').toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{result.display_name}</p>
                  <p className={`text-xs truncate ${result.type === 'shop' ? 'text-orange-400' : 'text-muted-foreground'}`}>
                    @{result.type === 'shop' ? result.id : result.display_name.toLowerCase().replace(/\s+/g, '')}
                    {result.type === 'shop' && ' · Shop'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
