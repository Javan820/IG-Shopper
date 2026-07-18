'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

interface MobileNavProps {
  isLoggedIn: boolean
}

const linkClass =
  'rounded-lg px-3 py-2.5 text-sm font-medium text-[#D8C3AC] hover:bg-white/10 hover:text-white'

export function MobileNav({ isLoggedIn }: MobileNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="rounded-md p-2 text-[#D8C3AC] hover:bg-white/10 hover:text-white"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-16 z-50 border-b border-white/10 bg-[#1A0F08] px-4 py-4 shadow-xl">
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            <Link href="/shops" onClick={() => setOpen(false)} className={linkClass}>
              Browse
            </Link>
            <Link href="/submit" onClick={() => setOpen(false)} className={linkClass}>
              Submit a Shop
            </Link>
            <Link href="/community" onClick={() => setOpen(false)} className={linkClass}>
              Community
            </Link>
            {isLoggedIn && (
              <>
                <Link href="/saved" onClick={() => setOpen(false)} className={linkClass}>
                  Saved
                </Link>
                <Link href="/profile" onClick={() => setOpen(false)} className={linkClass}>
                  Profile
                </Link>
                <Link href="/dashboard" onClick={() => setOpen(false)} className={linkClass}>
                  Dashboard
                </Link>
              </>
            )}
            {!isLoggedIn && (
              <Link href="/login" onClick={() => setOpen(false)} className={linkClass}>
                Log In
              </Link>
            )}
          </nav>
        </div>
      )}
    </div>
  )
}
