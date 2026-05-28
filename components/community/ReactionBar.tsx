'use client'

import { useState, useTransition } from 'react'
import type { ReactionCount } from '@/lib/supabase/types'

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢'] as const

interface ReactionBarProps {
  initialReactions: ReactionCount[]
  onToggle: (emoji: string) => Promise<{ reacted: boolean } | { error: string }>
  disabled?: boolean
}

export function ReactionBar({ initialReactions, onToggle, disabled }: ReactionBarProps) {
  const [reactions, setReactions] = useState<ReactionCount[]>(initialReactions)
  const [showPicker, setShowPicker] = useState(false)
  const [, startTransition] = useTransition()

  function handleReact(emoji: string) {
    if (disabled) return
    setShowPicker(false)

    const existing = reactions.find(r => r.emoji === emoji)
    setReactions(prev => {
      if (existing) {
        const newCount = existing.reacted ? existing.count - 1 : existing.count + 1
        if (newCount <= 0) return prev.filter(r => r.emoji !== emoji)
        return prev.map(r => r.emoji === emoji ? { ...r, count: newCount, reacted: !r.reacted } : r)
      }
      return [...prev, { emoji, count: 1, reacted: true }]
    })

    startTransition(async () => {
      const result = await onToggle(emoji)
      if ('error' in result) {
        setReactions(initialReactions)
      }
    })
  }

  const active = reactions.filter(r => r.count > 0)

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {active.map(r => (
        <button
          key={r.emoji}
          type="button"
          disabled={disabled}
          onClick={() => handleReact(r.emoji)}
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors disabled:cursor-default
            ${r.reacted
              ? 'border-primary/40 bg-primary/10 text-primary font-medium'
              : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
            }`}
        >
          <span>{r.emoji}</span>
          <span>{r.count}</span>
        </button>
      ))}

      {!disabled && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPicker(p => !p)}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
            aria-label="Add reaction"
          >
            +
          </button>
          {showPicker && (
            <div className="absolute bottom-8 left-0 z-20 flex gap-1 rounded-xl border bg-white p-2 shadow-lg">
              {EMOJI_LIST.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleReact(emoji)}
                  className="rounded-lg p-1.5 text-lg transition-colors hover:bg-slate-100 active:scale-110"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
