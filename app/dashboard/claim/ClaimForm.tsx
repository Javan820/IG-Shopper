'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { submitClaim } from '@/lib/actions/claims'

type State = { error: string } | null

interface ClaimFormProps {
  initialHandle?: string
}

export function ClaimForm({ initialHandle }: ClaimFormProps) {
  const [state, action, pending] = useActionState<State, FormData>(submitClaim, null)

  return (
    <form action={action} className="space-y-5">
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}

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
            defaultValue={initialHandle}
            placeholder="shopname"
            className="rounded-l-none"
            maxLength={30}
          />
        </div>
        <p className="text-xs text-muted-foreground">The IG handle of the shop you own</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ig_proof">
          Proof of Ownership <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="ig_proof"
          name="ig_proof"
          rows={5}
          required
          minLength={10}
          maxLength={1000}
          placeholder={`Describe how you can prove you own this shop. For example:\n• "I can post a specific story on @shopname as requested"\n• "I have access to the IG account email"\n• "DM us @OIGShopHK from the account"`}
        />
        <p className="text-xs text-muted-foreground">
          Our team will review your claim within 72 hours.
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Submitting claim…' : 'Submit Claim'}
      </Button>
    </form>
  )
}
