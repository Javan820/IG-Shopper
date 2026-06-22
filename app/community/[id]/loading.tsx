function ReplySkeleton() {
  return (
    <div className="px-4 py-3 border-t animate-pulse space-y-2 bg-slate-50/50">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-full bg-slate-200 shrink-0" />
        <div className="h-3 w-24 rounded bg-slate-200" />
      </div>
      <div className="ml-9 space-y-1.5">
        <div className="h-3 w-full rounded bg-slate-200" />
        <div className="h-3 w-4/5 rounded bg-slate-200" />
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
      <div className="h-5 w-36 rounded bg-slate-200 animate-pulse" />
      <div className="rounded-xl border overflow-hidden">
        <div className="p-4 animate-pulse space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-slate-200 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-28 rounded bg-slate-200" />
              <div className="h-3 w-20 rounded bg-slate-200" />
            </div>
          </div>
          <div className="h-5 w-2/3 rounded bg-slate-200" />
          <div className="space-y-1.5">
            <div className="h-3 w-full rounded bg-slate-200" />
            <div className="h-3 w-5/6 rounded bg-slate-200" />
            <div className="h-3 w-4/6 rounded bg-slate-200" />
          </div>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <ReplySkeleton key={i} />
        ))}
      </div>
    </main>
  )
}
