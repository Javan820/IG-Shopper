import { createBrowserClient } from '@supabase/ssr'
import { cleanEnv } from '@/lib/utils'
import type { Database } from './types'

export function createClient() {
  return createBrowserClient<Database>(
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  )
}
