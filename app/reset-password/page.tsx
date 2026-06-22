import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ResetPasswordForm from './reset-password-form'

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/forgot-password?error=link_invalid')
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            <span className="text-primary">IG</span>Shop HK
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">Set a new password</p>
        </div>

        <ResetPasswordForm />
      </div>
    </div>
  )
}
