'use client'

import { Suspense, useActionState, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestPasswordReset } from '@/lib/actions/auth'

type State = { error: string } | { success: true; email: string; ts: number } | null

const COOLDOWN_SECONDS = 60

function ForgotPasswordForm() {
  const searchParams = useSearchParams()
  const linkInvalid = searchParams.get('error') === 'link_invalid'

  const [state, action, pending] = useActionState<State, FormData>(requestPasswordReset, null)
  const [now, setNow] = useState(() => Date.now())

  const sent = state !== null && 'success' in state
  const sentTo = sent ? state.email : ''
  const sentAt = sent ? state.ts : 0
  const cooldown = sent ? Math.max(0, COOLDOWN_SECONDS - Math.floor((now - sentAt) / 1000)) : 0

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const buttonLabel = pending
    ? 'Sending…'
    : cooldown > 0
      ? `Resend in ${cooldown}s`
      : sent
        ? 'Resend link'
        : 'Send Reset Link'

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <form action={action} className="space-y-4">
        {linkInvalid && !sent && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            That reset link is invalid or has expired. Request a new one below.
          </p>
        )}

        {sent && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            If an account exists for {sentTo}, a password reset link is on its way. The link expires
            after a while — check your spam folder, and use the button below to resend if it doesn’t
            arrive.
          </div>
        )}

        {state !== null && 'error' in state && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
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
            defaultValue={sentTo}
            placeholder="you@example.com"
          />
        </div>

        <Button type="submit" className="w-full" disabled={pending || cooldown > 0}>
          {buttonLabel}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            <span className="text-primary">IG</span>Shop HK
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">Reset your password</p>
        </div>

        <Suspense fallback={<div className="rounded-xl border bg-white p-6 shadow-sm" />}>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
