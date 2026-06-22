'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { enqueueDiscoveryJob } from '@/lib/actions/discovery'
import { CATEGORIES } from '@/lib/constants'

type State = { error: string } | { success: true } | null

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

export function DiscoveryForm({ hasActiveJob }: { hasActiveJob: boolean }) {
  const [state, action, pending] = useActionState<State, FormData>(enqueueDiscoveryJob, null)
  const router = useRouter()

  // Refresh the page after a job is queued so it shows up in the list.
  useEffect(() => {
    if (state && 'success' in state) router.refresh()
  }, [state, router])

  // While a job is queued/running, poll so status + counts update live as the
  // local worker processes it.
  useEffect(() => {
    if (!hasActiveJob) return
    const id = setInterval(() => router.refresh(), 4000)
    return () => clearInterval(id)
  }, [hasActiveJob, router])

  return (
    <form action={action} className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
      {state && 'error' in state && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}
      {state && 'success' in state && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Search queued. The discovery worker will pick it up and shops will appear in the approval queue.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <select id="category" name="category" required defaultValue="" className={selectClass}>
            <option value="" disabled>Select a category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="target_count">How many</Label>
          <Input
            id="target_count"
            name="target_count"
            type="number"
            min={1}
            max={50}
            defaultValue={10}
            className="sm:w-28"
          />
        </div>
      </div>

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? 'Queuing…' : 'Search for new shops'}
      </Button>

      <p className="text-xs text-muted-foreground">
        Discovered shops are added to the approval queue as pending — nothing goes live until you approve it.
        The worker starts automatically and shuts down when finished.
      </p>
    </form>
  )
}
