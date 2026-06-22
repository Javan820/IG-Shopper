'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateShop } from '@/lib/actions/shops'
import { CATEGORIES, LOCATIONS, SHIPS_TO } from '@/lib/constants'
import type { Shop } from '@/lib/supabase/types'

type State = { error: string } | { success: true } | null

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

interface EditShopFormProps {
  shop: Shop
}

export function EditShopForm({ shop }: EditShopFormProps) {
  const [state, action, pending] = useActionState<State, FormData>(updateShop, null)

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="shop_id" value={shop.id} />
      <input type="hidden" name="ig_handle" value={shop.ig_handle} />

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

      <div className="space-y-1.5">
        <Label>Instagram Handle</Label>
        <div className="flex items-center">
          <span className="flex h-10 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
            @
          </span>
          <Input
            value={shop.ig_handle}
            disabled
            readOnly
            className="rounded-l-none"
            aria-label="Instagram handle (read-only)"
          />
        </div>
        <p className="text-xs text-muted-foreground">Handle cannot be changed after claiming.</p>
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
          placeholder="What does your shop sell? What makes it special?"
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
