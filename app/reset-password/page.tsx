'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updatePassword } from '@/lib/actions/auth'

type State = { error: string } | null

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState<State, FormData>(updatePassword, null)

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            <span className="text-primary">IG</span>Shop HK
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">Set a new password</p>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <form action={action} className="space-y-4">
            {state?.error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.error}
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Min. 8 characters"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Repeat your password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Saving…' : 'Set New Password'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
