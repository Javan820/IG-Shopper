'use client'

import { useTransition } from 'react'
import { clearRejectedShops } from '@/lib/actions/shops'
import { Button } from '@/components/ui/button'

export function ClearRejectedButton({ count }: { count: number }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm(`Permanently delete all ${count} rejected shop${count === 1 ? '' : 's'}? This cannot be undone.`)) return
    startTransition(async () => {
      await clearRejectedShops()
    })
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="border-destructive text-destructive hover:bg-destructive/10"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? 'Clearing…' : 'Clear All'}
    </Button>
  )
}
