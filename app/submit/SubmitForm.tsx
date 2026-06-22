'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { submitShop } from '@/lib/actions/shops'
import { CATEGORIES, LOCATIONS, SHIPS_TO } from '@/lib/constants'

type State = { error: string } | null

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

export function SubmitForm() {
  const [state, action, pending] = useActionState<State, FormData>(submitShop, null)

  return (
    <form action={action} className="space-y-5">
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="ig_handle">Instagram Handle <span className="text-destructive">*</span></Label>
        <div className="flex items-center">
          <span className="flex h-10 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">@</span>
          <Input
            id="ig_handle"
            name="ig_handle"
            type="text"
            required
            placeholder="shopname"
            className="rounded-l-none"
            maxLength={30}
          />
        </div>
        <p className="text-xs text-muted-foreground">The exact IG handle, without the @</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name">Shop Name <span className="text-destructive">*</span></Label>
        <Input id="name" name="name" type="text" required placeholder="My Lovely Shop" minLength={2} maxLength={100} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
          <select id="category" name="category" required className={selectClass}>
            <option value="">Select a category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="location">Location <span className="text-destructive">*</span></Label>
          <select id="location" name="location" required className={selectClass}>
            <option value="">Select a location</option>
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          maxLength={500}
          placeholder="What does your shop sell? What makes it special?"
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
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ships_to">Ships To</Label>
        <select id="ships_to" name="ships_to" className={selectClass}>
          <option value="">Not specified</option>
          {SHIPS_TO.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Submitting…' : 'Submit Shop'}
      </Button>
    </form>
  )
}
