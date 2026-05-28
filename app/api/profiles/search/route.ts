import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? ''
  if (q.length < 1) return NextResponse.json({ results: [] })

  const supabase = await createClient()

  const [{ data: profiles }, { data: shops }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .not('display_name', 'is', null)
      .ilike('display_name', `${q}%`)
      .limit(4),
    supabase
      .from('shops')
      .select('ig_handle, name, cover_image_url')
      .eq('status', 'approved')
      .eq('is_active', true)
      .or(`name.ilike.${q}%,ig_handle.ilike.${q}%`)
      .limit(4),
  ])

  const results = [
    ...(profiles ?? []).map((p) => ({
      type: 'user' as const,
      id: p.id,
      display_name: p.display_name!,
      avatar_url: p.avatar_url,
    })),
    ...(shops ?? []).map((s) => ({
      type: 'shop' as const,
      id: s.ig_handle,
      display_name: s.name,
      avatar_url: s.cover_image_url,
    })),
  ]

  return NextResponse.json({ results })
}
