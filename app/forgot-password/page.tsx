'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestPasswordReset } from '@/lib/actions/auth'

type State = { error: string } | { success: true } | null

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState<State, FormData>(requestPasswordReset, null)

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            <span className="text-primary">IG</span>Shop HK
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">Reset your password</p>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          {'success' in (state ?? {}) ? (
            <div className="space-y-4 text-center">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Check your email for a password reset link.
              </div>
              <Link href="/login" className="block text-sm font-medium text-primary hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form action={action} className="space-y-4">
              {'error' in (state ?? {}) && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {(state as { error: string }).error}
                </p>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                />
              </div>

              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? 'Sending…' : 'Send Reset Link'}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
