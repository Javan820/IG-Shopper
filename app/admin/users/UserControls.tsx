'use client'

import { useActionState } from 'react'
import { setUserTier, setUserDisplayTier, setUserRole } from '@/lib/actions/admin'
import { TIERS } from '@/lib/constants'

interface UserControlsProps {
  userId: string
  currentTierOverride: string | null
  currentDisplayTier: string | null
  currentRole: 'user' | 'admin'
  isSelf: boolean
}

export function UserControls({ userId, currentTierOverride, currentDisplayTier, currentRole, isSelf }: UserControlsProps) {
  const [tierState, tierAction, tierPending] = useActionState(setUserTier, null)
  const [displayTierState, displayTierAction, displayTierPending] = useActionState(setUserDisplayTier, null)
  const [roleState, roleAction, rolePending] = useActionState(setUserRole, null)

  return (
    <div className="flex flex-col gap-2">
      {/* Tier override (admin-forced, bypasses review count) */}
      <form action={tierAction} className="flex items-center gap-1.5">
        <input type="hidden" name="user_id" value={userId} />
        <span className="w-24 shrink-0 text-[11px] text-muted-foreground">Force badge</span>
        <select
          name="tier_override"
          defaultValue={currentTierOverride ?? 'auto'}
          className="rounded-md border border-input bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="auto">Auto (by reviews)</option>
          {TIERS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={tierPending}
          className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          {tierPending ? 'Saving…' : 'Set'}
        </button>
        {tierState && 'error' in tierState && (
          <span className="text-xs text-destructive">{tierState.error}</span>
        )}
      </form>

      {/* Display tier (user's chosen style — admin can override without earn gate) */}
      <form action={displayTierAction} className="flex items-center gap-1.5">
        <input type="hidden" name="user_id" value={userId} />
        <span className="w-24 shrink-0 text-[11px] text-muted-foreground">Display style</span>
        <select
          name="display_tier"
          defaultValue={currentDisplayTier ?? 'auto'}
          className="rounded-md border border-input bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="auto">User default</option>
          {TIERS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={displayTierPending}
          className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          {displayTierPending ? 'Saving…' : 'Set'}
        </button>
        {displayTierState && 'error' in displayTierState && (
          <span className="text-xs text-destructive">{displayTierState.error}</span>
        )}
      </form>

      {/* Role toggle */}
      {!isSelf && (
        <form action={roleAction} className="flex items-center gap-1.5">
          <input type="hidden" name="user_id" value={userId} />
          <select
            name="role"
            defaultValue={currentRole}
            className="rounded-md border border-input bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={rolePending}
            className="rounded-md border border-input bg-white px-2 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            {rolePending ? 'Saving…' : 'Set Role'}
          </button>
          {roleState && 'error' in roleState && (
            <span className="text-xs text-destructive">{roleState.error}</span>
          )}
        </form>
      )}
    </div>
  )
}
