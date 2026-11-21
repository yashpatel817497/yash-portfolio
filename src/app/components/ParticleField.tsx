import { useEffect, useRef } from 'react'

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  hue: number
}

const LINK_DISTANCE = 136
const POINTER_DISTANCE = 190

/**
 * A drifting neural-net field: nodes connect to their neighbours and reach for
 * the cursor. Canvas rather than DOM so it stays cheap, and it renders one
 * static frame when the visitor prefers reduced motion.
 */
export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const pointer = { x: -10_000, y: -10_000 }
    let width = 0
    let height = 0
    let nodes: Node[] = []
    let frame = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.max(24, Math.min(92, Math.round((width * height) / 19_000)))
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.26,
        vy: (Math.random() - 0.5) * 0.26,
        r: Math.random() * 1.3 + 0.7,
        hue: Math.random() > 0.5 ? 186 : 264,
      }))
      if (reduce) draw()
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          const distance = Math.hypot(a.x - b.x, a.y - b.y)
          if (distance > LINK_DISTANCE) continue
          ctx.strokeStyle = `hsla(${a.hue}, 100%, 70%, ${(1 - distance / LINK_DISTANCE) * 0.3})`
          ctx.lineWidth = 0.7
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
        const pointerDistance = Math.hypot(a.x - pointer.x, a.y - pointer.y)
        if (pointerDistance < POINTER_DISTANCE) {
          ctx.strokeStyle = `hsla(188, 100%, 74%, ${(1 - pointerDistance / POINTER_DISTANCE) * 0.45})`
          ctx.lineWidth = 0.8
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(pointer.x, pointer.y)
          ctx.stroke()
        }
        ctx.fillStyle = `hsla(${a.hue}, 100%, 80%, 0.85)`
        ctx.beginPath()
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const tick = () => {
      for (const node of nodes) {
        node.x += node.vx
        node.y += node.vy
        if (node.x < -30) node.x = width + 30
        if (node.x > width + 30) node.x = -30
        if (node.y < -30) node.y = height + 30
        if (node.y > height + 30) node.y = -30
        const dx = node.x - pointer.x
        const dy = node.y - pointer.y
        const distance = Math.hypot(dx, dy)
        if (distance < 120 && distance > 0.01) {
          node.x += (dx / distance) * 0.7
          node.y += (dy / distance) * 0.7
        }
      }
      draw()
      frame = window.requestAnimationFrame(tick)
    }

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointer.x = event.clientX - rect.left
      pointer.y = event.clientY - rect.top
    }

    resize()
    if (!reduce) frame = window.requestAnimationFrame(tick)

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    const observer = new ResizeObserver(() => resize())
    observer.observe(canvas)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onPointerMove)
      observer.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 size-full" />
}
