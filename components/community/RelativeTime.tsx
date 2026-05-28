'use client'

export function RelativeTime({ date }: { date: string }) {
  const diff = Date.now() - new Date(date).getTime()
  const s = Math.floor(diff / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)

  let label: string
  if (s < 60) label = 'now'
  else if (m < 60) label = `${m}m`
  else if (h < 24) label = `${h}h`
  else if (d < 7) label = `${d}d`
  else label = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <time dateTime={date} title={new Date(date).toLocaleString()} className="text-sm text-muted-foreground">
      {label}
    </time>
  )
}
