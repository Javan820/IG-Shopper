import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * Service-role client — bypasses RLS entirely.
 * ONLY use in server-side admin operations (Server Actions, API routes).
 * NEVER import this in Client Components or expose to the browser.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
