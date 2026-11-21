import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'

import { safeHref, type Section } from '../../data/content'
import { useContent } from '../lib/content-store'
import { Lines, Reveal, Words } from './motion'

export function About({ section }: { section: Section }) {
  const { content } = useContent()
  const portrait = safeHref(section.image) || safeHref(content.portrait)
  const initials = content.name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const heading = section.heading.split('\n').filter(Boolean)
  const reduce = useReducedMotion()
  const frameRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: frameRef, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['-5%', '5%'])

  return (
    <section id={section.id} className="relative mx-auto max-w-[1280px] scroll-mt-20 px-5 pt-28 sm:px-8 sm:pt-40">
      {section.eyebrow && <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-accent">{section.eyebrow}</p>}
      <div className="mt-8 grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <Reveal className="relative">
          <div ref={frameRef} className="group relative overflow-hidden rounded-[24px] border border-line bg-surface">
            <div className="relative aspect-[4/5]">
              {portrait ? (
                <motion.img
                  src={portrait}
                  alt={content.name}
                  style={{ y: reduce ? 0 : y }}
                  loading="lazy"
                  className="absolute inset-0 size-full scale-[1.1] object-cover"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(120%_100%_at_20%_0%,color-mix(in_srgb,var(--color-accent)_22%,transparent),transparent_65%)]">
                  <span className="font-display text-[clamp(72px,10vw,120px)] leading-none tracking-[-0.04em] text-fg/90">{initials}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/10 to-transparent" />
              <div className="grid-lines absolute inset-0 opacity-30" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/80 to-transparent" />
              <div className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-[14px] border border-line-strong/70 bg-bg/60 px-3.5 py-2.5 backdrop-blur-md">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{content.location}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">{content.available ? 'available' : 'booked'}</span>
              </div>
            </div>
          </div>
          <div aria-hidden className="pointer-events-none absolute -inset-3 -z-10 rounded-[30px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-accent)_16%,transparent),transparent)] blur-xl" />
        </Reveal>

        <div className="flex flex-col justify-center">
          {heading.length > 0 && (
            <Lines as="h2" className="font-display text-balance text-[clamp(32px,4.4vw,54px)]" lines={heading} />
          )}
          <div className="mt-7 max-w-xl space-y-4 text-[15px] leading-relaxed text-muted sm:text-[16px]">
            <Words text={content.bio[0] ?? ''} className="text-pretty text-fg/80" />
            {content.bio.slice(1).map((paragraph, index) => (
              <Reveal key={index} delay={0.08 * index}>
                <p className="text-pretty">{paragraph}</p>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.15} className="mt-8 flex flex-wrap gap-2">
            {content.socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-line-strong px-3.5 py-1.5 text-[12.5px] text-muted transition-colors hover:border-accent/60 hover:bg-accent/10 hover:text-accent"
              >
                {social.label}
              </a>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  )
}
