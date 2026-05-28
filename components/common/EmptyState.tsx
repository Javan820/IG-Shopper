import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  title: string
  description?: string
  action?: {
    label: string
    href: string
  }
  dashed?: boolean
}

export function EmptyState({ title, description, action, dashed = true }: EmptyStateProps) {
  return (
    <div
      className={`rounded-xl border bg-white py-16 text-center shadow-sm ${dashed ? 'border-dashed' : ''}`}
    >
      <p className="text-base font-medium">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && (
        <Button asChild className="mt-4">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  )
}
