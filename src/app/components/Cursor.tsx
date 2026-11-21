import { motion, useMotionValue, useSpring } from 'motion/react'
import { useEffect, useState } from 'react'

import { cx } from '../lib/cx'

/** A soft ring that trails the pointer and swells over anything clickable. */
export function Cursor() {
  const [enabled, setEnabled] = useState(false)
  const [active, setActive] = useState(false)
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const sx = useSpring(x, { stiffness: 520, damping: 38, mass: 0.35 })
  const sy = useSpring(y, { stiffness: 520, damping: 38, mass: 0.35 })

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    setEnabled(true)
    const move = (event: PointerEvent) => {
      x.set(event.clientX)
      y.set(event.clientY)
    }
    const over = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null
      setActive(Boolean(target?.closest('a, button, [data-cursor]')))
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerover', over, { passive: true })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerover', over)
    }
  }, [x, y])

  if (!enabled) return null

  return (
    <motion.div style={{ x: sx, y: sy }} aria-hidden className="pointer-events-none fixed left-0 top-0 z-[90] -ml-6 -mt-6 flex size-12 items-center justify-center">
      <div className={cx('rounded-full border transition-all duration-300', active ? 'size-11 border-accent/70 bg-accent/10' : 'size-6 border-fg/25')} />
    </motion.div>
  )
}
