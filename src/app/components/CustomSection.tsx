import { safeHref, type Section } from '../../data/content'
import { Lines, Reveal } from './motion'

export function CustomSection({ section }: { section: Section }) {
  const paragraphs = section.note.split('\n\n').map((item) => item.trim()).filter(Boolean)
  const heading = section.heading.split('\n').filter(Boolean)
  const href = safeHref(section.image)

  return (
    <section id={section.id} className="relative mx-auto max-w-[1280px] scroll-mt-20 px-5 pt-24 sm:px-8 sm:pt-32">
      <div className={href ? 'grid items-center gap-10 lg:grid-cols-2' : 'max-w-3xl'}>
        <div>
          {section.eyebrow && <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-accent">{section.eyebrow}</p>}
          {heading.length > 0 && (
            <Lines as="h2" className="mt-3 font-display text-balance text-[clamp(32px,5vw,60px)]" lines={heading} />
          )}
          {paragraphs.length > 0 && (
            <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-muted sm:text-[16px]">
              {paragraphs.map((paragraph, index) => (
                <Reveal key={index} delay={index * 0.06}>
                  <p className="max-w-xl text-pretty">{paragraph}</p>
                </Reveal>
              ))}
            </div>
          )}
          {section.links.length > 0 && (
            <div className="mt-7 flex flex-wrap gap-2">
              {section.links.map((link, index) => {
                const target = safeHref(link.href)
                return target ? (
                  <a
                    key={`${link.label}-${index}`}
                    href={target}
                    target={target.startsWith('http') ? '_blank' : undefined}
                    rel="noreferrer"
                    className="rounded-full border border-line-strong px-4 py-2 text-[13px] text-fg transition-colors hover:border-accent/60 hover:bg-accent/10 hover:text-accent"
                  >
                    {link.label || target}
                  </a>
                ) : null
              })}
            </div>
          )}
        </div>
        {href && (
          <Reveal className="relative overflow-hidden rounded-[24px] border border-line bg-surface">
            <img src={href} alt={section.heading || section.eyebrow || ''} loading="lazy" className="aspect-[4/3] size-full object-cover" />
            <div className="grid-lines pointer-events-none absolute inset-0 opacity-20" />
          </Reveal>
        )}
      </div>
    </section>
  )
}
