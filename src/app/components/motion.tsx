import { motion, useInView, useMotionValue, useSpring } from 'motion/react'
import { useRef, type ReactNode } from 'react'

import { cx } from '../lib/cx'

export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/** Lines of text that rise out of a mask, one after another. */
export function Lines({ lines, className, delay = 0, as: Tag = 'h1' }: { lines: ReactNode[]; className?: string; delay?: number; as?: 'h1' | 'h2' | 'p' }) {
  const ref = useRef<HTMLHeadingElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -5% 0px' })
  return (
    <Tag ref={ref} className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
          <motion.span className="block" initial={{ y: '110%' }} animate={inView ? { y: 0 } : { y: '110%' }} transition={{ duration: 1, delay: delay + i * 0.1, ease: EASE }}>
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  )
}

/** A paragraph whose words rise into place as it scrolls into view. */
export function Words({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  const words = text.split(' ')
  return (
    <p ref={ref} className={className}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: '105%', opacity: 0 }}
            animate={inView ? { y: 0, opacity: 1 } : { y: '105%', opacity: 0 }}
            transition={{ duration: 0.65, delay: delay + Math.min(i * 0.014, 0.9), ease: EASE }}
          >
            {word}
            {'\u00A0'}
          </motion.span>
        </span>
      ))}
    </p>
  )
}

export function Reveal({ children, delay = 0, className, y = 22 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.85, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/** A button that leans toward the cursor. */
export function Magnetic({ children, className, strength = 0.25 }: { children: ReactNode; className?: string; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useSpring(useMotionValue(0), { stiffness: 240, damping: 18, mass: 0.4 })
  const y = useSpring(useMotionValue(0), { stiffness: 240, damping: 18, mass: 0.4 })
  return (
    <motion.div
      ref={ref}
      style={{ x, y }}
      className={cx('inline-block', className)}
      onMouseMove={(e) => {
        const rect = ref.current?.getBoundingClientRect()
        if (!rect) return
        x.set((e.clientX - rect.left - rect.width / 2) * strength)
        y.set((e.clientY - rect.top - rect.height / 2) * strength)
      }}
      onMouseLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.div>
  )
}
