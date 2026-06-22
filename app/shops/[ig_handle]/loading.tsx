import { ReviewListSkeleton } from '@/components/common/LoadingSkeleton'

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="h-64 sm:h-80 w-full bg-slate-200 animate-pulse" />
      <div className="border-b bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 space-y-3 animate-pulse">
          <div className="flex gap-2">
            <div className="h-5 w-20 rounded-full bg-slate-200" />
          </div>
          <div className="h-7 w-48 rounded-lg bg-slate-200" />
          <div className="h-4 w-28 rounded bg-slate-200" />
          <div className="h-4 w-36 rounded bg-slate-200" />
          <div className="h-3 w-full max-w-sm rounded bg-slate-200" />
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <ReviewListSkeleton count={3} />
      </div>
    </div>
  )
}
