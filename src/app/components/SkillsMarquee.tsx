import type { Section } from '../../data/content'
import { useContent } from '../lib/content-store'
import { Reveal } from './motion'

function Row({ items, reverse = false }: { items: string[]; reverse?: boolean }) {
  const doubled = [...items, ...items]
  return (
    <div
      className="group relative overflow-hidden py-3 [mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)]"
      aria-hidden
    >
      <ul
        className={
          reverse
            ? 'flex w-max animate-marquee-slow items-center gap-3 [animation-direction:reverse] group-hover:[animation-play-state:paused]'
            : 'flex w-max animate-marquee items-center gap-3 group-hover:[animation-play-state:paused]'
        }
      >
        {doubled.map((item, index) => (
          <li key={`${item}-${index}`} className="group/item flex items-center gap-3">
            <span className="rounded-full border border-line bg-surface/70 px-4 py-2 font-mono text-[12px] tracking-tight text-muted transition-colors hover:border-accent/50 hover:text-fg">
              {item}
            </span>
            <span className="size-1 rounded-full bg-accent/40" />
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SkillsMarquee({ section }: { section: Section }) {
  const { content } = useContent()
  const mid = Math.ceil(content.skills.length / 2)
  const first = content.skills.slice(0, mid)
  const second = content.skills.slice(mid)

  return (
    <section id={section.id} className="relative scroll-mt-20 border-y border-line bg-surface/30 py-20 sm:py-24">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            {section.eyebrow && <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-accent">{section.eyebrow}</p>}
            {section.heading && <h2 className="mt-3 font-display text-[clamp(32px,4.6vw,54px)]">{section.heading}</h2>}
          </div>
          <Reveal className="max-w-xs text-[13.5px] leading-relaxed text-muted">
            {section.note || 'Chosen for the problem, not the resume.'} {content.skills.length} in rotation.
          </Reveal>
        </div>
      </div>

      <div className="mt-9 space-y-1">
        <Row items={first.length ? first : content.skills} />
        <Row items={second.length ? second : content.skills} reverse />
      </div>
    </section>
  )
}
