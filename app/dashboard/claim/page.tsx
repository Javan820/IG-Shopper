import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BadgeCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ClaimForm } from './ClaimForm'

interface PageProps {
  searchParams: Promise<{ success?: string; handle?: string }>
}

export default async function ClaimPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { success, handle } = await searchParams

  if (success === '1') {
    return (
      <div className="rounded-xl border bg-white py-16 text-center shadow-sm">
        <BadgeCheck className="mx-auto mb-3 h-10 w-10 text-emerald-500" aria-hidden="true" />
        <h1 className="text-lg font-semibold">Claim submitted!</h1>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Our team will review your claim within 72 hours. We will contact you if we need more
          information.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Claim a Shop</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Own an Instagram shop listed in our directory? Submit proof of ownership and we&apos;ll
          verify you within 72 hours.
        </p>
      </div>

      <div className="max-w-lg rounded-xl border bg-white p-6 shadow-sm">
        <ClaimForm initialHandle={handle} />
      </div>
    </div>
  )
}
