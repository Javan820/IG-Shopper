'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteThread } from '@/lib/actions/threads'

export function DeleteThreadButton({ threadId }: { threadId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('Delete this thread?')) return
    startTransition(async () => {
      const result = await deleteThread(threadId)
      if (result?.error) {
        alert(`Could not delete: ${result.error}`)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      aria-label="Delete thread"
      className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}
