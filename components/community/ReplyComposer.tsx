'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, X } from 'lucide-react'
import { createReply } from '@/lib/actions/threads'
import { Button } from '@/components/ui/button'
import { MentionTextarea } from './MentionTextarea'

type State = { error: string } | { success: true } | null

export function ReplyComposer({ threadId }: { threadId: string }) {
  const [state, action, pending] = useActionState<State, FormData>(createReply, null)
  const [content, setContent] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (state && 'success' in state) {
      setContent('')
      clearImage()
      router.refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, router])

  useEffect(() => {
    return () => { if (imagePreview) URL.revokeObjectURL(imagePreview) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(file ? URL.createObjectURL(file) : null)
  }

  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handlePaste(e: React.ClipboardEvent) {
    const imageItem = Array.from(e.clipboardData.items).find((item) => item.type.startsWith('image/'))
    if (!imageItem) return
    const file = imageItem.getAsFile()
    if (!file) return
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(URL.createObjectURL(file))
    const dt = new DataTransfer()
    dt.items.add(file)
    if (fileRef.current) fileRef.current.files = dt.files
  }

  return (
    <form action={action} onPaste={handlePaste} className="flex gap-3 px-4 py-3 border-b">
      <div className="h-9 w-9 shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
        <span className="text-primary text-xs font-bold">+</span>
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <input type="hidden" name="thread_id" value={threadId} />
        <MentionTextarea
          name="content"
          value={content}
          onValueChange={setContent}
          rows={2}
          maxLength={300}
          placeholder="Write a reply… use @name to mention someone"
          required
          className="w-full bg-transparent text-[15px] placeholder:text-muted-foreground resize-none focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />

        {imagePreview && (
          <div className="relative mt-2 w-fit">
            <img
              src={imagePreview}
              alt=""
              className="max-h-40 rounded-xl object-cover"
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
              aria-label="Remove photo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          name="image"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div className="flex items-center gap-2">
            {!imagePreview && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1 rounded-full border border-dashed px-3 h-7 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                aria-label="Add photo"
              >
                <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                Photo
              </button>
            )}
            {state && 'error' in state && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
          </div>
          <Button type="submit" size="sm" disabled={pending} className="rounded-full px-5 shrink-0">
            {pending ? 'Posting…' : 'Reply'}
          </Button>
        </div>
      </div>
    </form>
  )
}
