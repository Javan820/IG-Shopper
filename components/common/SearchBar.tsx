'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface SearchBarProps {
  defaultValue?: string
  placeholder?: string
  live?: boolean
  variant?: 'default' | 'hero'
}

export function SearchBar({
  defaultValue = '',
  placeholder = 'Search shops, IG handles, categories…',
  live = false,
  variant = 'default',
}: SearchBarProps) {
  const router = useRouter()
  const [query, setQuery] = useState(defaultValue)

  // Reads live URL params from the browser so existing filters survive a search
  // update, without pulling in useSearchParams (which would force every page
  // rendering this component into a Suspense boundary). Only called client-side.
  const buildHref = useCallback(
    (value: string): string => {
      const trimmed = value.trim()
      if (!live) {
        return trimmed ? `/shops?q=${encodeURIComponent(trimmed)}` : '/shops'
      }
      const params = new URLSearchParams(
        typeof window === 'undefined' ? '' : window.location.search
      )
      if (trimmed) params.set('q', trimmed)
      else params.delete('q')
      params.delete('page')
      const qs = params.toString()
      return qs ? `/shops?${qs}` : '/shops'
    },
    [live]
  )

  const mounted = useRef(false)
  useEffect(() => {
    if (!live) return
    if (!mounted.current) {
      mounted.current = true
      return
    }
    const id = setTimeout(() => router.replace(buildHref(query)), 300)
    return () => clearTimeout(id)
  }, [query, live, router, buildHref])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    router.push(buildHref(query))
  }

  if (variant === 'hero') {
    return (
      <form onSubmit={handleSubmit} className="relative w-full max-w-2xl">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="h-16 rounded-full border-[--border] bg-white pl-7 pr-16 text-base shadow-[0_2px_4px_rgba(26,15,8,0.04),0_16px_40px_-12px_rgba(26,15,8,0.18)] transition-shadow focus-visible:shadow-[0_2px_4px_rgba(26,15,8,0.06),0_20px_48px_-12px_rgba(199,62,29,0.25)] sm:text-lg"
          aria-label="Search shops"
          suppressHydrationWarning
        />
        <Button
          type="submit"
          size="icon"
          aria-label="Search"
          className="absolute right-2.5 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full shadow-md transition-transform hover:scale-105"
        >
          <Search className="h-5 w-5" />
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-2xl gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="h-12 pl-10 text-base"
          aria-label="Search shops"
          suppressHydrationWarning
        />
      </div>
      <Button type="submit" size="lg" className="h-12 px-6">
        Search
      </Button>
    </form>
  )
}
