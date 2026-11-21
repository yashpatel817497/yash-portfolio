import { motion, useReducedMotion } from 'motion/react'
import { ArrowDown, ArrowUpRight } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { Section } from '../../data/content'
import { useContent } from '../lib/content-store'
import { EASE, Magnetic, Reveal } from './motion'
import { ParticleField } from './ParticleField'

const FALLBACK_TITLES = ['AI-ML Student']

/** Cycles through the role list, character by character. Static when calm. */
function Typewriter({ words }: { words: string[] }) {
  const reduce = useReducedMotion()
  const list = words.length ? words : FALLBACK_TITLES
  const [index, setIndex] = useState(0)
  const [text, setText] = useState(list[0])
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (reduce) return
    const current = list[index % list.length]
    if (!deleting && text === current) {
      const hold = window.setTimeout(() => setDeleting(true), 2100)
      return () => window.clearTimeout(hold)
    }
    if (deleting && text.length === 0) {
      setDeleting(false)
      setIndex((value) => (value + 1) % list.length)
      return
    }
    const step = window.setTimeout(
      () => setText(deleting ? current.slice(0, Math.max(0, text.length - 1)) : current.slice(0, text.length + 1)),
      deleting ? 32 : 68,
    )
    return () => window.clearTimeout(step)
  }, [text, deleting, index, list, reduce])

  return (
    <span className="font-mono text-accent">
      {reduce ? list[0] : text}
      <span className="ml-0.5 animate-blink text-accent">▌</span>
    </span>
  )
}

export function Hero({ section }: { section: Section }) {
  const { content } = useContent()
  const words = content.name.split(' ').filter(Boolean)

  return (
    <section id={section.id === 'hero' ? 'top' : section.id} className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <ParticleField />
        <div className="absolute left-1/2 top-[-18%] size-[46rem] -translate-x-1/2 animate-float rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-accent)_20%,transparent),transparent)] blur-2xl" />
        <div className="absolute -right-[10%] top-[30%] size-[34rem] animate-float rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-accent-2)_18%,transparent),transparent)] blur-2xl [animation-delay:-6s]" />
        <div className="grid-lines absolute inset-0 opacity-[0.55]" />
        <div className="grain absolute inset-0" />
      </div>

      <div className="relative mx-auto flex w-full max-w-[1280px] flex-1 flex-col justify-center px-5 pb-12 pt-28 sm:px-8 sm:pt-32">
        <Reveal className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface/60 px-3 py-1.5 backdrop-blur-sm">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-70" />
              <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
            </span>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
              {content.available ? 'Open to new work' : 'Currently booked'}
            </span>
          </span>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-faint">{content.location}</span>
        </Reveal>

        <h1 className="mt-6 font-display text-[clamp(44px,10.5vw,148px)] leading-[0.92] tracking-[-0.04em]">
          {words.map((word, index) => (
            <span key={`${word}-${index}`} className="block overflow-hidden pb-[0.07em] -mb-[0.07em]">
              <motion.span
                className="block bg-gradient-to-b from-white via-white to-fg/45 bg-clip-text text-transparent"
                initial={{ y: '112%' }}
                animate={{ y: 0 }}
                transition={{ duration: 1.15, delay: 0.15 + index * 0.09, ease: EASE }}
              >
                {word}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.55, ease: EASE }} className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <span className="text-[13px] uppercase tracking-[0.22em] text-faint">{content.role}</span>
          <span className="hidden h-3 w-px bg-line-strong sm:block" />
          <span className="text-[15px] sm:text-[17px]">
            <Typewriter words={content.titles} />
          </span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.68, ease: EASE }}
          className="mt-7 max-w-xl text-pretty text-[15.5px] leading-relaxed text-muted sm:text-[17px]"
        >
          {content.intro}
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.8, ease: EASE }} className="mt-9 flex flex-wrap items-center gap-3">
          <Magnetic>
            <a
              href="#work"
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-fg px-6 text-[14px] font-medium text-bg transition-colors hover:bg-accent"
            >
              See selected work
              <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </Magnetic>
          {content.email ? (
            <Magnetic>
              <a
                href={`mailto:${content.email}`}
                className="inline-flex h-12 items-center gap-2 rounded-full border border-line-strong px-6 text-[14px] text-fg transition-colors hover:border-accent/60 hover:bg-accent/10 hover:text-accent"
              >
                {content.email}
              </a>
            </Magnetic>
          ) : content.socials[0] ? (
            <Magnetic>
              <a
                href={content.socials[0].href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-line-strong px-6 text-[14px] text-fg transition-colors hover:border-accent/60 hover:bg-accent/10 hover:text-accent"
              >
                {content.socials[0].label}
              </a>
            </Magnetic>
          ) : null}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.05 }}
        className="relative mx-auto w-full max-w-[1280px] px-5 pb-10 sm:px-8"
      >
        {content.stats.length > 0 && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 border-t border-line pt-6 sm:grid-cols-4">
            {content.stats.map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-[26px] text-fg sm:text-[32px]">{stat.value}</p>
                <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">scroll</span>
          <ArrowDown className="size-4 animate-bounce text-faint" />
        </div>
      </motion.div>
    </section>
  )
}
