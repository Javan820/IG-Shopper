import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SubmitForm } from './SubmitForm'

interface SubmitPageProps {
  searchParams: Promise<{ success?: string }>
}

export default async function SubmitPage({ searchParams }: SubmitPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { success } = await searchParams

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Submit a Shop</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Know a great Instagram shop? Add it to the directory. All submissions are reviewed before going live.
          </p>
        </div>

        {success === '1' && (
          <div className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Shop submitted! It will appear in the directory once approved by our team.
          </div>
        )}

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <SubmitForm />
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Not affiliated with or endorsed by Instagram / Meta.
        </p>
      </div>
    </div>
  )
}
