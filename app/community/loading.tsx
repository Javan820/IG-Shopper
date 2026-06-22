function ThreadSkeleton() {
  return (
    <div className="p-4 animate-pulse space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-slate-200 shrink-0" />
        <div className="space-y-1 flex-1">
          <div className="h-3 w-28 rounded bg-slate-200" />
          <div className="h-2.5 w-16 rounded bg-slate-200" />
        </div>
      </div>
      <div className="h-4 w-3/4 rounded bg-slate-200 ml-10" />
      <div className="space-y-1.5 ml-10">
        <div className="h-3 w-full rounded bg-slate-200" />
        <div className="h-3 w-5/6 rounded bg-slate-200" />
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="animate-pulse space-y-2">
        <div className="h-7 w-32 rounded-lg bg-slate-200" />
        <div className="h-4 w-56 rounded bg-slate-200" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-7 w-20 rounded-full bg-slate-200 animate-pulse" />
        ))}
      </div>
      <div className="rounded-xl border overflow-hidden divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          <ThreadSkeleton key={i} />
        ))}
      </div>
    </main>
  )
}
