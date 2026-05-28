'use client'

import { useState, useEffect, useRef } from 'react'
import { useActionState } from 'react'
import { Star, ImagePlus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { submitReview } from '@/lib/actions/reviews'

type State = { error: string } | { success: true } | null

interface ReviewFormProps {
  shopId: string
  igHandle: string
  onSuccess: () => void
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_IMAGES = 4

export function ReviewForm({ shopId, igHandle, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [state, action, pending] = useActionState<State, FormData>(submitReview, null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [imageError, setImageError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const succeeded = !!(state && 'success' in state)

  useEffect(() => {
    if (succeeded) {
      imagePreviews.forEach(URL.revokeObjectURL)
      onSuccess()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [succeeded])

  useEffect(() => {
    return () => imagePreviews.forEach(URL.revokeObjectURL)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (succeeded) return null

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setImageError(null)
    const picked = Array.from(e.target.files ?? [])
    const total = imageFiles.length + picked.length
    if (total > MAX_IMAGES) {
      setImageError(`You can add up to ${MAX_IMAGES} photos.`)
      e.target.value = ''
      return
    }
    const invalid = picked.find((f) => !ALLOWED_TYPES.includes(f.type) || f.size > MAX_FILE_SIZE)
    if (invalid) {
      setImageError('Each photo must be JPEG, PNG, or WebP and under 5 MB.')
      e.target.value = ''
      return
    }
    const newFiles = [...imageFiles, ...picked]
    const newPreviews = [...imagePreviews, ...picked.map((f) => URL.createObjectURL(f))]
    // Rebuild the file input's FileList so FormData includes all images
    const dt = new DataTransfer()
    newFiles.forEach((f) => dt.items.add(f))
    if (fileRef.current) fileRef.current.files = dt.files
    setImageFiles(newFiles)
    setImagePreviews(newPreviews)
  }

  function removeImage(i: number) {
    URL.revokeObjectURL(imagePreviews[i])
    const newFiles = imageFiles.filter((_, idx) => idx !== i)
    const newPreviews = imagePreviews.filter((_, idx) => idx !== i)
    const dt = new DataTransfer()
    newFiles.forEach((f) => dt.items.add(f))
    if (fileRef.current) fileRef.current.files = dt.files
    setImageFiles(newFiles)
    setImagePreviews(newPreviews)
  }

  function handlePaste(e: React.ClipboardEvent) {
    const imageItem = Array.from(e.clipboardData.items).find((item) => item.type.startsWith('image/'))
    if (!imageItem) return
    const file = imageItem.getAsFile()
    if (!file) return
    if (imageFiles.length >= MAX_IMAGES) {
      setImageError(`You can add up to ${MAX_IMAGES} photos.`)
      return
    }
    if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE) {
      setImageError('Each photo must be JPEG, PNG, or WebP and under 5 MB.')
      return
    }
    setImageError(null)
    const newFiles = [...imageFiles, file]
    const newPreviews = [...imagePreviews, URL.createObjectURL(file)]
    const dt = new DataTransfer()
    newFiles.forEach((f) => dt.items.add(f))
    if (fileRef.current) fileRef.current.files = dt.files
    setImageFiles(newFiles)
    setImagePreviews(newPreviews)
  }

  return (
    <form action={action} onPaste={handlePaste} className="space-y-4">
      {state && 'error' in state && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <input type="hidden" name="shop_id" value={shopId} />
      <input type="hidden" name="ig_handle" value={igHandle} />
      <input type="hidden" name="rating" value={rating} />

      <div className="space-y-1.5">
        <Label>
          Rating <span className="text-destructive">*</span>
        </Label>
        <div
          className="flex gap-1"
          role="group"
          aria-label="Select a rating"
          onMouseLeave={() => setHovered(0)}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              aria-label={`${star} star${star !== 1 ? 's' : ''}`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Star
                className={cn(
                  'h-7 w-7 transition-colors',
                  star <= (hovered || rating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-muted text-muted'
                )}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="review-title">Title</Label>
        <Input
          id="review-title"
          name="title"
          placeholder="Summary of your experience"
          maxLength={100}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="review-body">Review</Label>
        <Textarea
          id="review-body"
          name="body"
          rows={4}
          maxLength={1000}
          placeholder="Share details about your experience..."
        />
      </div>

      {/* Image picker */}
      <div className="space-y-2">
        <Label>
          Photos{' '}
          <span className="text-xs font-normal text-muted-foreground">
            (up to {MAX_IMAGES}, 5 MB each)
          </span>
        </Label>

        <input
          ref={fileRef}
          type="file"
          name="images"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {imagePreviews.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {imagePreviews.map((src, i) => (
              <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80 transition-colors"
                  aria-label="Remove photo"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {imageFiles.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
            Add photos
          </button>
        )}

        {imageError && (
          <p className="text-xs text-destructive">{imageError}</p>
        )}
      </div>

      <Button type="submit" disabled={pending || rating === 0}>
        {pending ? 'Submitting…' : 'Submit Review'}
      </Button>
    </form>
  )
}
