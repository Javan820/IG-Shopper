'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { Play, ExternalLink } from 'lucide-react'
import type { ShopPost } from '@/lib/supabase/types'

interface ShopPostsDeckProps {
  posts: ShopPost[]
  igHandle: string
  shopName: string
  avatarUrl: string | null
  gradient: string
}

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  const minutes = seconds / 60
  const hours = minutes / 60
  const days = hours / 24
  if (minutes < 60) return `${Math.max(1, Math.floor(minutes))}m`
  if (hours < 24) return `${Math.floor(hours)}h`
  if (days < 7) return `${Math.floor(days)}d`
  return `${Math.floor(days / 7)}w`
}

export function ShopPostsDeck({ posts, igHandle, shopName, avatarUrl, gradient }: ShopPostsDeckProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: 0, lastX: 0, lastT: 0, velocity: 0, raf: 0 })

  const stopMomentum = () => {
    if (drag.current.raf) cancelAnimationFrame(drag.current.raf)
    drag.current.raf = 0
  }

  const startMomentum = () => {
    const track = trackRef.current
    if (!track) return
    let velocity = drag.current.velocity
    const step = () => {
      if (Math.abs(velocity) < 0.05) {
        track.style.scrollSnapType = ''
        drag.current.raf = 0
        return
      }
      track.scrollLeft -= velocity * 16
      velocity *= 0.94
      drag.current.raf = requestAnimationFrame(step)
    }
    drag.current.raf = requestAnimationFrame(step)
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    const track = trackRef.current
    if (!track) return
    stopMomentum()
    track.style.scrollSnapType = 'none'
    drag.current = { ...drag.current, active: true, startX: e.clientX, startScroll: track.scrollLeft, moved: 0, lastX: e.clientX, lastT: performance.now(), velocity: 0 }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    const track = trackRef.current
    if (!state.active || !track) return
    const dx = e.clientX - state.startX
    state.moved = Math.max(state.moved, Math.abs(dx))
    track.scrollLeft = state.startScroll - dx
    const now = performance.now()
    const dt = now - state.lastT
    if (dt > 0) {
      state.velocity = (e.clientX - state.lastX) / dt
      state.lastX = e.clientX
      state.lastT = now
    }
  }

  const endDrag = () => {
    if (!drag.current.active) return
    drag.current.active = false
    startMomentum()
  }

  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drag.current.moved > 8) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  if (posts.length === 0) return null

  return (
    <section aria-label={`Latest Instagram posts from ${shopName}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Latest on Instagram</h2>
        <a
          href={`https://instagram.com/${igHandle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          @{igHandle}
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>

      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={onClickCapture}
        className="flex snap-x snap-proximity gap-4 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden select-none cursor-grab active:cursor-grabbing"
      >
        {posts.map((post, index) => (
          <a
            key={post.id}
            href={`https://www.instagram.com/p/${post.shortcode}/`}
            target="_blank"
            rel="noopener noreferrer"
            draggable={false}
            aria-label={post.is_video ? 'Watch this reel on Instagram' : 'View this post on Instagram'}
            className="group relative aspect-[9/16] w-44 shrink-0 snap-start overflow-hidden rounded-2xl bg-slate-900 shadow-[0_2px_4px_rgba(26,15,8,0.06),0_12px_28px_-12px_rgba(26,15,8,0.25)] transition-transform duration-200 hover:-translate-y-1 sm:w-52"
          >
            <Image
              src={post.media_url}
              alt={post.caption ?? `Instagram post by @${igHandle}`}
              fill
              sizes="(min-width: 640px) 13rem, 11rem"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              draggable={false}
            />

            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/60 to-transparent" />
            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />

            <div aria-hidden="true" className="absolute inset-x-2 top-2 flex gap-1">
              {posts.map((_, i) => (
                <span
                  key={i}
                  className={`h-0.5 flex-1 rounded-full ${i <= index ? 'bg-white/90' : 'bg-white/30'}`}
                />
              ))}
            </div>

            <div className="absolute inset-x-2 top-4 flex items-center gap-2">
              <span className={`relative h-7 w-7 shrink-0 overflow-hidden rounded-full ring-2 ring-white/80 bg-gradient-to-br ${gradient}`}>
                {avatarUrl && (
                  <Image src={avatarUrl} alt="" fill sizes="28px" className="object-cover" draggable={false} />
                )}
              </span>
              <span className="truncate text-xs font-semibold text-white drop-shadow">@{igHandle}</span>
              {post.taken_at && (
                <span className="ml-auto text-xs text-white/80 drop-shadow">{timeAgo(post.taken_at)}</span>
              )}
            </div>

            {post.is_video && (
              <span
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm transition-transform duration-200 group-hover:scale-110"
              >
                <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
              </span>
            )}

            {post.caption && (
              <p className="absolute inset-x-3 bottom-3 line-clamp-2 text-xs leading-snug text-white/95 drop-shadow">
                {post.caption}
              </p>
            )}
          </a>
        ))}
      </div>
    </section>
  )
}
