import Link from 'next/link'
import { LoginForm } from './LoginForm'

interface LoginPageProps {
  searchParams: Promise<{ message?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { message } = await searchParams

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            <span className="text-primary">IG</span>Shop HK
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        {message === 'check-email' && (
          <div className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Account created! Check your email to confirm your address before signing in.
          </div>
        )}

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
