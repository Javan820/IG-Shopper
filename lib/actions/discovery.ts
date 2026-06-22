'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { CATEGORIES } from '@/lib/constants'
import type { TablesInsert } from '@/lib/supabase/types'
import { spawn } from 'child_process'
import path from 'path'

function spawnWorker() {
  try {
    const workerDir = path.join(process.cwd(), 'worker')
    const python = path.join(workerDir, '.venv', 'Scripts', 'python.exe')
    const child = spawn(python, ['discovery_worker.py'], {
      cwd: workerDir,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    })
    child.unref()
  } catch {
    // Non-fatal — no-op on non-local environments (Vercel, etc.)
  }
}

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin' ? user : null
}

const EnqueueDiscoverySchema = z.object({
  category: z.enum(CATEGORIES),
  target_count: z.coerce.number().int().min(1, 'Find at least 1 shop.').max(50, 'Find at most 50 shops per run.'),
})

export async function enqueueDiscoveryJob(_: unknown, formData: FormData) {
  const admin = await requireAdmin()
  if (!admin) return { error: 'Unauthorised.' }

  const parsed = EnqueueDiscoverySchema.safeParse({
    category: formData.get('category'),
    target_count: formData.get('target_count'),
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const adminClient = createAdminClient()
  const payload: TablesInsert<'shop_discovery_jobs'> = {
    category: parsed.data.category,
    target_count: parsed.data.target_count,
    requested_by: admin.id,
  }

  const { error } = await adminClient.from('shop_discovery_jobs').insert(payload as never)
  if (error) return { error: error.message }

  spawnWorker()

  revalidatePath('/admin/discovery')
  return { success: true as const }
}
