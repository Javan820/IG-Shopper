import 'server-only'
import { cache } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from './server'

/**
 * Per-request cached auth lookup.
 *
 * `getUser()` validates the session over the network on every call. The Navbar,
 * NotificationBell, layouts, and pages each need the user, which previously meant
 * 3-4 identical round-trips per page load. React `cache()` dedupes them to one
 * call per server render — call this everywhere instead of `supabase.auth.getUser()`.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

/**
 * Per-request cached profile role for the signed-in user (e.g. 'admin').
 * Returns null when logged out. Shared by the Navbar and the admin layout.
 */
export const getUserRole = cache(async (): Promise<string | null> => {
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return data?.role ?? null
})
