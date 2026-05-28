'use client'

import { useState } from 'react'
import { Power } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ShutdownButton() {
  const [confirming, setConfirming] = useState(false)
  const [shutting, setShutting] = useState(false)

  async function handleShutdown() {
    setShutting(true)
    await fetch('/api/admin/shutdown', { method: 'POST' })
  }

  if (shutting) {
    return (
      <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-red-200 bg-white px-4 py-2 shadow-lg text-sm text-red-700 font-medium">
        Shutting down…
      </div>
    )
  }

  if (confirming) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border bg-white p-2 shadow-lg">
        <span className="pl-1 text-xs text-muted-foreground">Shut down server?</span>
        <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
        <Button
          size="sm"
          className="bg-red-600 hover:bg-red-700"
          onClick={handleShutdown}
        >
          Shutdown
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        size="sm"
        variant="outline"
        className="border-red-200 text-red-600 shadow-sm hover:bg-red-50"
        onClick={() => setConfirming(true)}
      >
        <Power className="mr-1.5 h-3.5 w-3.5" />
        Shutdown
      </Button>
    </div>
  )
}
