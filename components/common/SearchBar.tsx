'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface SearchBarProps {
  defaultValue?: string
  placeholder?: string
}

export function SearchBar({
  defaultValue = '',
  placeholder = 'Search shops, IG handles, categories…',
}: SearchBarProps) {
  const router = useRouter()
  const [query, setQuery] = useState(defaultValue)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (q) {
      router.push(`/shops?q=${encodeURIComponent(q)}`)
    } else {
      router.push('/shops')
    }
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
