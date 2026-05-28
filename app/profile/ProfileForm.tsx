'use client'

import { useActionState, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateProfile } from '@/lib/actions/auth'
import { TIERS, getTier, getEarnedTiers, type TierId } from '@/lib/constants'
import { UserTierBadge } from '@/components/common/UserTierBadge'
import { cn } from '@/lib/utils'
import type { Profile } from '@/lib/supabase/types'

type State = { error: string } | { success: true } | null

interface ProfileFormProps {
  profile: Profile
}

const ADMIN_STYLE_OPTION = { id: 'admin' as const, label: 'Admin Style' }

export function ProfileForm({ profile }: ProfileFormProps) {
  const [state, action, pending] = useActionState<State, FormData>(updateProfile, null)
  const [preview, setPreview] = useState<string | null>(profile.avatar_url)
  const fileRef = useRef<HTMLInputElement>(null)

  const isAdmin = profile.role === 'admin'
  const earnedTiers = getEarnedTiers(profile.review_count)
  const activeTierId = getTier(
    profile.review_count,
    null,
    profile.display_tier as TierId | null
  ).id

  // Admins default to 'admin' style if they haven't set a preference
  const [selectedTier, setSelectedTier] = useState<string>(
    profile.display_tier ?? (isAdmin ? 'admin' : activeTierId)
  )

  // Admins see all 5 tiers + exclusive Admin Style; regular users see only earned tiers
  const pickerTiers = isAdmin
    ? ([...TIERS, ADMIN_STYLE_OPTION] as { id: string; label: string }[])
    : earnedTiers
  const showPicker = isAdmin || earnedTiers.length >= 1

  return (
    <form action={action} className="space-y-5">
      {state && 'error' in state && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state && 'success' in state && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Profile updated.
        </p>
      )}

      {/* Avatar */}
      <div className="space-y-1.5">
        <Label>Profile Picture</Label>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-primary/10">
            {preview ? (
              <img src={preview} alt="Profile picture" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-primary">
                {profile.display_name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              name="avatar"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) setPreview(URL.createObjectURL(file))
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              Change Photo
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">JPEG, PNG, WebP · max 5 MB</p>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="display_name">Display Name</Label>
        <Input
          id="display_name"
          name="display_name"
          type="text"
          required
          defaultValue={profile.display_name ?? ''}
          minLength={2}
          maxLength={50}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={300}
          placeholder="A short bio about yourself…"
          defaultValue={profile.bio ?? ''}
        />
        <p className="text-xs text-muted-foreground">300 characters max</p>
      </div>

      {showPicker && (
        <div className="space-y-2">
          <div>
            <Label>Badge Style</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Choose which badge to show on your reviews.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {pickerTiers.map((tier) => (
              <button
                key={tier.id}
                type="button"
                onClick={() => setSelectedTier(tier.id)}
                className={cn(
                  'flex flex-col items-start rounded-lg border p-3 text-left transition-colors',
                  selectedTier === tier.id
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:border-primary/40 hover:bg-muted/50',
                  tier.id === 'admin' && 'border-amber-200 bg-amber-50/50'
                )}
              >
                <span className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {tier.label}
                  {tier.id === 'admin' && (
                    <span className="ml-1 rounded bg-red-100 px-1 py-0.5 text-[9px] text-red-600">
                      Admin only
                    </span>
                  )}
                </span>
                <UserTierBadge
                  name={profile.display_name ?? 'You'}
                  reviewCount={profile.review_count}
                  role={profile.role}
                  tierOverride={tier.id}
                  className="text-sm"
                />
              </button>
            ))}
          </div>
          <input type="hidden" name="display_tier" value={selectedTier} />
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save Changes'}
      </Button>
    </form>
  )
}
