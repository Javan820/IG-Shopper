'use client'

import { useActionState, useState, useTransition, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { adminUpdateShop, uploadShopCover } from '@/lib/actions/shops'
import { CATEGORIES, LOCATIONS, SHIPS_TO } from '@/lib/constants'
import type { Shop } from '@/lib/supabase/types'

type State = { error: string } | { success: true } | null

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

export function AdminEditShopForm({ shop }: { shop: Shop }) {
  const [state, action, pending] = useActionState<State, FormData>(adminUpdateShop, null)
  const [coverError, setCoverError] = useState<string | null>(null)
  const [coverSuccess, setCoverSuccess] = useState(false)
  const [coverPending, startCoverTransition] = useTransition()
  const [previewUrl, setPreviewUrl] = useState<string | null>(shop.cover_image_url ?? null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function setFile(file: File) {
    setPendingFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setCoverSuccess(false)
    setCoverError(null)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setFile(file)
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          setFile(file)
          e.preventDefault()
          break
        }
      }
    }
  }

  useEffect(() => {
    function handleGlobalPaste(e: ClipboardEvent) {
      const active = document.activeElement
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            setFile(file)
            break
          }
        }
      }
    }
    document.addEventListener('paste', handleGlobalPaste)
    return () => document.removeEventListener('paste', handleGlobalPaste)
  }, [])

  function handleCoverUpload() {
    setCoverError(null)
    setCoverSuccess(false)
    const file = pendingFile ?? fileInputRef.current?.files?.[0] ?? null
    if (!file) {
      setCoverError('No file selected.')
      return
    }
    const formData = new FormData()
    formData.append('shop_id', shop.id)
    formData.append('cover_image', file)
    startCoverTransition(async () => {
      const result = await uploadShopCover(formData)
      if (result && 'error' in result) {
        setCoverError(result.error ?? null)
      } else {
        setCoverSuccess(true)
        setPendingFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    })
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="shop_id" value={shop.id} />

      {state && 'error' in state && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state && 'success' in state && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Shop updated successfully.
        </p>
      )}

      {/* Cover image upload */}
      <div className="space-y-3 rounded-lg border p-4">
        <Label>Cover Image</Label>
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        <div
          className="relative h-36 overflow-hidden rounded-lg bg-gradient-to-br from-amber-400 to-orange-400 cursor-pointer outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          tabIndex={0}
          onPaste={handlePaste}
          title="Ctrl+V anywhere to paste an image"
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Cover preview" className="h-full w-full object-contain bg-slate-100" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 p-3">
              <span className="text-xs text-white/70">Ctrl+V to paste · or choose file below</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                @{shop.ig_handle}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            ref={fileInputRef}
            type="file"
            name="cover_image"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="flex-1 cursor-pointer"
          />
          <Button type="button" size="sm" variant="outline" onClick={handleCoverUpload} disabled={coverPending} className="shrink-0">
            {coverPending ? 'Uploading…' : 'Upload'}
          </Button>
        </div>
        {coverError && <p className="text-sm text-destructive">{coverError}</p>}
        {coverSuccess && <p className="text-sm text-emerald-600">Cover image updated.</p>}
        <p className="text-xs text-muted-foreground">JPEG, PNG or WebP · max 10 MB</p>
      </div>

      {/* Admin status controls */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-4">
        <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Admin Controls</p>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              required
              className={selectClass}
              defaultValue={shop.status}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="is_active">Active (publicly visible)</Label>
            <select
              id="is_active"
              name="is_active"
              required
              className={selectClass}
              defaultValue={String(shop.is_active)}
            >
              <option value="true">Yes — live on site</option>
              <option value="false">No — hidden</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="is_verified">Verified Badge</Label>
          <select
            id="is_verified"
            name="is_verified"
            required
            className={selectClass}
            defaultValue={String(shop.is_verified)}
          >
            <option value="true">Yes — show verified badge</option>
            <option value="false">No</option>
          </select>
        </div>
      </div>

      {/* IG handle — editable by admin */}
      <div className="space-y-1.5">
        <Label htmlFor="ig_handle">
          Instagram Handle <span className="text-destructive">*</span>
        </Label>
        <div className="flex items-center">
          <span className="flex h-10 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
            @
          </span>
          <Input
            id="ig_handle"
            name="ig_handle"
            type="text"
            required
            defaultValue={shop.ig_handle}
            maxLength={30}
            className="rounded-l-none"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name">
          Shop Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={shop.name}
          minLength={2}
          maxLength={100}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="category">
            Category <span className="text-destructive">*</span>
          </Label>
          <select
            id="category"
            name="category"
            required
            className={selectClass}
            defaultValue={shop.category ?? ''}
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="location">
            Location <span className="text-destructive">*</span>
          </Label>
          <select
            id="location"
            name="location"
            required
            className={selectClass}
            defaultValue={shop.location ?? ''}
          >
            <option value="">Select a location</option>
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sub_location">Sub-location / District</Label>
        <Input
          id="sub_location"
          name="sub_location"
          type="text"
          maxLength={100}
          placeholder="e.g. Mong Kok"
          defaultValue={shop.sub_location ?? ''}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          maxLength={500}
          placeholder="What does this shop sell?"
          defaultValue={shop.description ?? ''}
        />
        <p className="text-xs text-muted-foreground">500 characters max</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="website_url">Website / Link Tree</Label>
        <Input
          id="website_url"
          name="website_url"
          type="url"
          placeholder="https://example.com"
          defaultValue={shop.website_url ?? ''}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ships_to">Ships To</Label>
        <select
          id="ships_to"
          name="ships_to"
          className={selectClass}
          defaultValue={shop.ships_to?.[0] ?? ''}
        >
          <option value="">Not specified</option>
          {SHIPS_TO.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Saving…' : 'Save Changes'}
      </Button>
    </form>
  )
}
