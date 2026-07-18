import Link from 'next/link'
import { LoginForm } from './LoginForm'

interface LoginPageProps {
  searchParams: Promise<{ message?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { message } = await searchParams

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-baseline gap-2">
            <span
              className="text-3xl font-black tracking-tight text-[--primary]"
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              OIG
            </span>
            <span className="text-sm font-semibold text-muted-foreground">掃貨正!</span>
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        {message === 'check-email' && (
          <div className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Account created! Check your email to confirm your address before signing in.
          </div>
        )}

        <div className="rounded-2xl border bg-white p-6 shadow-[0_2px_4px_rgba(26,15,8,0.04),0_16px_40px_-16px_rgba(26,15,8,0.14)]">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
