'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

interface MobileNavProps {
  isLoggedIn: boolean
}

export function MobileNav({ isLoggedIn }: MobileNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="rounded-md p-2 text-muted-foreground hover:text-foreground"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-16 z-50 border-b bg-white px-4 py-4 shadow-md">
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            <Link
              href="/shops"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-slate-50 hover:text-foreground"
            >
              Browse
            </Link>
            <Link
              href="/submit"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-slate-50 hover:text-foreground"
            >
              Submit a Shop
            </Link>
            <Link
              href="/community"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-slate-50 hover:text-foreground"
            >
              Community
            </Link>
            {isLoggedIn && (
              <>
                <Link
                  href="/saved"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-slate-50 hover:text-foreground"
                >
                  Saved
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-slate-50 hover:text-foreground"
                >
                  Profile
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-slate-50 hover:text-foreground"
                >
                  Dashboard
                </Link>
              </>
            )}
            {!isLoggedIn && (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-slate-50 hover:text-foreground"
              >
                Log In
              </Link>
            )}
          </nav>
        </div>
      )}
    </div>
  )
}
