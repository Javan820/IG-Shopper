'use client'

import * as React from "react"
import { motion, useAnimation } from "framer-motion"
import { cn } from "@/lib/utils"

const IG_COLORS = {
  purple: "#833AB4",
  pink:   "#E1306C",
  orange: "#F77737",
}

interface GlitchTextProps {
  text: string
  className?: string
  textClassName?: string
  colors?: { layer1: string; layer2: string; layer3: string }
  intervalMs?: number
  glitchDurationMs?: number
}

export function GlitchText({
  text,
  className,
  textClassName,
  colors = { layer1: IG_COLORS.purple, layer2: IG_COLORS.pink, layer3: IG_COLORS.orange },
  intervalMs = 3000,
  glitchDurationMs = 350,
}: GlitchTextProps) {
  const c1 = useAnimation()
  const c2 = useAnimation()
  const c3 = useAnimation()

  React.useEffect(() => {
    const d = glitchDurationMs / 1000
    const t: number[] = [0, 0.2, 0.5, 0.8, 1]

    const burst = () => {
      Promise.all([
        c1.start({ x: [-4, 4, -2, 0, 0], y: [1, -1, 0.5, 0, 0], opacity: [0, 0.82, 0.88, 0.7, 0], transition: { duration: d, times: t, ease: "easeOut" } }),
        c2.start({ x: [4, -4, 2, 0, 0],  y: [-1, 1, -0.5, 0, 0], opacity: [0, 0.82, 0.88, 0.7, 0], transition: { duration: d, times: t, ease: "easeOut" } }),
        c3.start({ x: [-2, 3, -1, 0, 0], y: [2, -2, 1, 0, 0],    opacity: [0, 0.65, 0.72, 0.55, 0], transition: { duration: d * 0.85, times: t, ease: "easeOut" } }),
      ])
    }

    burst()
    const id = setInterval(burst, intervalMs)
    return () => clearInterval(id)
  }, [c1, c2, c3, intervalMs, glitchDurationMs])

  const layerClass = cn(
    "absolute inset-0 pointer-events-none select-none whitespace-nowrap",
    textClassName,
  )

  return (
    <span className={cn("relative inline-block", className)}>
      <span className={textClassName}>{text}</span>
      <motion.span aria-hidden="true" className={layerClass} style={{ color: colors.layer1, mixBlendMode: "multiply" }} initial={{ x: 0, y: 0, opacity: 0 }} animate={c1}>{text}</motion.span>
      <motion.span aria-hidden="true" className={layerClass} style={{ color: colors.layer2, mixBlendMode: "multiply" }} initial={{ x: 0, y: 0, opacity: 0 }} animate={c2}>{text}</motion.span>
      <motion.span aria-hidden="true" className={layerClass} style={{ color: colors.layer3, mixBlendMode: "multiply" }} initial={{ x: 0, y: 0, opacity: 0 }} animate={c3}>{text}</motion.span>
    </span>
  )
}
