import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { spawn } from 'child_process'
import path from 'path'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(request.url)
  const mode = url.searchParams.get('mode') === 'dev' ? 'dev' : 'start'

  const scriptPath = path.join(process.cwd(), 'Restart OIG Shop.ps1')
  spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-Mode', mode], {
    detached: true,
    stdio: 'ignore',
  }).unref()

  setTimeout(() => process.exit(0), 500)
  return NextResponse.json({ ok: true })
}
