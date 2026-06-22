'use client'

import { useActionState, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { changePassword } from '@/lib/actions/auth'

type State = { error: string } | { success: true } | null

export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState<State, FormData>(changePassword, null)

  useEffect(() => {
    if (state && 'success' in state) {
      const t = setTimeout(() => setOpen(false), 1200)
      return () => clearTimeout(t)
    }
  }, [state])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Change Password</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          {state && 'error' in state && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}
          {state && 'success' in state && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Password updated successfully.
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm New Password</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              required
              minLength={8}
              placeholder="Repeat your new password"
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Saving…' : 'Update Password'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
