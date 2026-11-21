import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, Code2, ExternalLink, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { Project, Section } from '../../data/content'
import { useContent } from '../lib/content-store'
import { cx } from '../lib/cx'
import { EASE, Lines } from './motion'

function ProjectArt({ project, index }: { project: Project; index: number }) {
  const [spot, setSpot] = useState({ x: 50, y: 50 })
  const hue = project.hue

  return (
    <div
      className="relative aspect-[16/10] overflow-hidden rounded-[20px] border border-line bg-surface"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        setSpot({ x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 })
      }}
    >
      {project.image ? (
        <img
          src={project.image}
          alt={project.title}
          loading="lazy"
          className="absolute inset-0 size-full object-cover opacity-85 transition-transform duration-[1200ms] ease-out group-hover:scale-[1.05]"
        />
      ) : (
        <>
          <div
            className="absolute inset-0 transition-transform duration-[1400ms] ease-out group-hover:scale-[1.07]"
            style={{
              background: `radial-gradient(110% 90% at 16% 6%, hsl(${hue} 100% 62% / 0.42), transparent 62%), radial-gradient(90% 80% at 88% 100%, hsl(${(hue + 70) % 360} 100% 66% / 0.34), transparent 60%)`,
            }}
          />
          <div className="grid-lines absolute inset-0 opacity-70" />
          <svg aria-hidden viewBox="0 0 400 250" preserveAspectRatio="none" className="absolute inset-0 size-full opacity-70">
            <g stroke="rgba(255,255,255,0.22)" strokeWidth="0.6">
              <path d="M0 190 L90 120 L170 160 L250 90 L340 130 L400 70" fill="none" />
              <path d="M0 150 L80 95 L160 130 L240 60 L330 105 L400 45" fill="none" opacity="0.55" />
            </g>
            <g fill={`hsl(${hue} 100% 78%)`}>
              <circle cx="90" cy="120" r="2.4" />
              <circle cx="170" cy="160" r="2" />
              <circle cx="250" cy="90" r="2.8" />
              <circle cx="340" cy="130" r="1.8" />
              <circle cx="80" cy="95" r="1.6" opacity="0.7" />
              <circle cx="240" cy="60" r="1.6" opacity="0.7" />
            </g>
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <span className="font-display text-[clamp(56px,9vw,116px)] tracking-tight text-white/10">{String(index + 1).padStart(2, '0')}</span>
          </div>
        </>
      )}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `radial-gradient(240px circle at ${spot.x}% ${spot.y}%, rgba(255,255,255,0.16), transparent 72%)` }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="absolute left-4 top-4 flex items-center gap-2">
        <span className="rounded-full border border-white/15 bg-black/30 px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/80 backdrop-blur-sm">
          {project.category}
        </span>
      </div>
      <span className="absolute bottom-4 right-4 grid size-9 place-items-center rounded-full border border-white/20 bg-black/30 text-white/80 backdrop-blur-sm transition-all duration-500 group-hover:bg-accent group-hover:text-bg">
        <ArrowUpRight className="size-4" />
      </span>
    </div>
  )
}

function ProjectModal({ project, onClose }: { project: Project; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <motion.div className="fixed inset-0 z-[75] flex items-end justify-center p-0 sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default bg-black/75 backdrop-blur-sm" />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={project.title}
        initial={{ y: 48, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 32, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="relative max-h-[92svh] w-full max-w-2xl overflow-y-auto rounded-t-[26px] border border-line-strong bg-[#070a11] p-5 sm:rounded-[26px] sm:p-8"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
              {project.category} · {project.year}
            </p>
            <h3 className="mt-2 font-display text-[34px] leading-none sm:text-[44px]">{project.title}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close project" className="grid size-9 shrink-0 place-items-center rounded-full border border-line-strong text-muted transition-colors hover:border-accent/60 hover:text-accent">
            <X className="size-4" />
          </button>
        </div>

        <ProjectArt project={project} index={0} />

        <div className="mt-6 space-y-4 text-[14.5px] leading-relaxed text-muted">
          {project.description.split('\n\n').filter(Boolean).map((paragraph, index) => (
            <p key={index} className="text-pretty">
              {paragraph}
            </p>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
              {tag}
            </span>
          ))}
        </div>

        {(project.link || project.repo) && (
          <div className="mt-7 flex flex-wrap gap-3 border-t border-line pt-5">
            {project.link && (
              <a href={project.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-fg px-4 py-2 text-[13px] font-medium text-bg transition-colors hover:bg-accent">
                <ExternalLink className="size-3.5" /> Live project
              </a>
            )}
            {project.repo && (
              <a href={project.repo} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-[13px] text-fg transition-colors hover:border-accent/60 hover:text-accent">
                <Code2 className="size-3.5" /> Source
              </a>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export function Work({ section }: { section: Section }) {
  const { content } = useContent()
  const [openId, setOpenId] = useState<string | null>(null)
  const selected = content.projects.find((project) => project.id === openId) ?? null
  const heading = section.heading.split('\n').filter(Boolean)

  return (
    <section id={section.id} className="relative mx-auto max-w-[1280px] scroll-mt-20 px-5 pt-24 sm:px-8 sm:pt-32">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {section.eyebrow && <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-accent">{section.eyebrow}</p>}
          {heading.length > 0 && <Lines as="h2" className="mt-3 font-display text-[clamp(38px,6vw,68px)]" lines={heading} />}
        </div>
        <p className="max-w-xs text-[13.5px] leading-relaxed text-muted">
          {section.note || `${content.projects.length} projects. Click any one for the short version of what was built and what changed.`}
        </p>
      </div>

      <div className="mt-10 grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:gap-x-7 lg:gap-y-14">
        {content.projects.map((project, index) => (
          <motion.article
            key={project.id}
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -8% 0px' }}
            transition={{ duration: 0.8, delay: (index % 2) * 0.08, ease: EASE }}
            className="group"
          >
            <button type="button" onClick={() => setOpenId(project.id)} className="w-full text-left" aria-label={`Open ${project.title}`}>
              <ProjectArt project={project} index={index} />
              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-[24px] leading-tight transition-colors group-hover:text-accent">{project.title}</h3>
                  <p className="mt-1.5 max-w-[38ch] text-[13.5px] leading-relaxed text-muted">{project.summary}</p>
                </div>
                <span className="shrink-0 font-mono text-[11px] text-faint">{project.year}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {project.tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="rounded-full border border-line px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-faint">
                    {tag}
                  </span>
                ))}
                {project.tags.length > 4 && <span className={cx('font-mono text-[9.5px] text-faint')}>+{project.tags.length - 4}</span>}
              </div>
            </button>
          </motion.article>
        ))}
      </div>

      <AnimatePresence>{selected && <ProjectModal project={selected} onClose={() => setOpenId(null)} />}</AnimatePresence>
    </section>
  )
}
