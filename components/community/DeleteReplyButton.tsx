'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteReply } from '@/lib/actions/threads'

export function DeleteReplyButton({ replyId, threadId }: { replyId: string; threadId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      await deleteReply(replyId, threadId)
    })
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      aria-label="Delete reply"
      className="p-1 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}
