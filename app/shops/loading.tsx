import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-8 w-36 rounded-lg bg-slate-200 animate-pulse" />
          <div className="h-9 w-full sm:w-80 rounded-lg bg-slate-200 animate-pulse" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <aside className="w-full shrink-0 lg:w-60 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 rounded-lg bg-slate-200 animate-pulse" />
            ))}
          </aside>
          <main className="min-w-0 flex-1">
            <LoadingSkeleton count={6} />
          </main>
        </div>
      </div>
    </div>
  )
}
