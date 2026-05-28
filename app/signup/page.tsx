import Link from 'next/link'
import { SignupForm } from './SignupForm'

export default function SignupPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            <span className="text-primary">IG</span>Shop HK
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">Create your account</p>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <SignupForm />
        </div>
      </div>
    </div>
  )
}
