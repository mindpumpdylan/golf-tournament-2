'use client'
import { useEffect, useRef } from 'react'

const PARTICLE_COUNT = 55
const COLORS = [
  [201, 168, 76],   // gold
  [240, 230, 204],  // cream
  [0, 255, 135],    // green-live
]

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
  colorIdx: number
  phase: number
  phaseSpeed: number
}

function makeParticle(w: number, h: number): Particle {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.36,
    vy: (Math.random() - 0.5) * 0.36,
    radius: 0.8 + Math.random() * 1.7,
    opacity: 0.08 + Math.random() * 0.27,
    colorIdx: Math.random() < 0.65 ? 0 : Math.random() < 0.7 ? 1 : 2,
    phase: Math.random() * Math.PI * 2,
    phaseSpeed: 0.006 + Math.random() * 0.01,
  }
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let w = window.innerWidth
    let h = window.innerHeight
    canvas.width = w
    canvas.height = h

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => makeParticle(w, h))

    let rafId: number

    const draw = () => {
      ctx.clearRect(0, 0, w, h)

      for (const p of particles) {
        if (!reduced) {
          p.phase += p.phaseSpeed
          const wobble = Math.sin(p.phase) * 0.12
          p.x += p.vx + wobble
          p.y += p.vy

          if (p.x < -4) p.x = w + 4
          else if (p.x > w + 4) p.x = -4
          if (p.y < -4) p.y = h + 4
          else if (p.y > h + 4) p.y = -4
        }

        const [r, g, b] = COLORS[p.colorIdx]
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${p.opacity})`
        ctx.fill()
      }

      if (!reduced) rafId = requestAnimationFrame(draw)
    }

    draw()

    const onResize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w
      canvas.height = h
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  )
}
