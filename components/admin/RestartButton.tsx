'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function RestartButton() {
  const [confirming, setConfirming] = useState(false)
  const [restarting, setRestarting] = useState(false)

  async function handleRestart() {
    setRestarting(true)
    await fetch('/api/admin/restart', { method: 'POST' })
  }

  if (restarting) {
    return (
      <div className="fixed bottom-4 right-20 z-50 rounded-lg border border-blue-200 bg-white px-4 py-2 shadow-lg text-sm text-blue-700 font-medium">
        Restarting… (~5s)
      </div>
    )
  }

  if (confirming) {
    return (
      <div className="fixed bottom-4 right-20 z-50 flex items-center gap-2 rounded-lg border bg-white p-2 shadow-lg">
        <span className="pl-1 text-xs text-muted-foreground">Restart server?</span>
        <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
          onClick={handleRestart}
        >
          Restart
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-20 z-50">
      <Button
        size="sm"
        variant="outline"
        className="border-blue-200 text-blue-600 shadow-sm hover:bg-blue-50"
        onClick={() => setConfirming(true)}
      >
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
        Restart
      </Button>
    </div>
  )
}
