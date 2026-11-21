import { ArrowUp, ArrowUpRight } from 'lucide-react'

import { useContent } from '../lib/content-store'
import { Lines, Magnetic, Reveal } from './motion'

export function Footer() {
  const { content } = useContent()
  const heading = content.footerHeading.split('\n').filter(Boolean)

  return (
    <footer id="contact" className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[26rem] bg-[radial-gradient(60%_100%_at_50%_100%,color-mix(in_srgb,var(--color-accent)_16%,transparent),transparent_70%)]" />
      <div className="relative mx-auto max-w-[1280px] px-5 py-24 sm:px-8 sm:py-32">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-accent">Contact</p>
        <Lines as="h2" className="mt-6 font-display text-[clamp(40px,7.5vw,104px)]" lines={heading.length ? heading : ['Say hello.']} />

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          {content.email ? (
            <Magnetic>
              <a href={`mailto:${content.email}`} className="group inline-flex h-13 items-center gap-2 rounded-full bg-fg px-6 py-3.5 text-[15px] font-medium text-bg transition-colors hover:bg-accent">
                {content.email}
                <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            </Magnetic>
          ) : content.socials[0] ? (
            <Magnetic>
              <a
                href={content.socials[0].href}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex h-13 items-center gap-2 rounded-full bg-fg px-6 py-3.5 text-[15px] font-medium text-bg transition-colors hover:bg-accent"
              >
                {content.socials[0].label}
                <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            </Magnetic>
          ) : null}
          {content.phone && (
            <a
              href={`tel:${content.phone.replace(/[^\d+]/g, '')}`}
              className="link-draw text-[13.5px] text-muted transition-colors hover:text-fg"
            >
              {content.phone}
            </a>
          )}
          <p className="text-[13.5px] text-muted">{content.footerNote || (content.available ? 'Taking on new projects this quarter.' : 'Fully booked at the moment.')}</p>
        </div>

        <Reveal className="mt-20 grid gap-8 border-t border-line pt-8 text-[13px] sm:grid-cols-3">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {content.socials.map((social) => (
              <li key={social.label}>
                <a href={social.href} target="_blank" rel="noreferrer" className="link-draw text-muted transition-colors hover:text-fg">
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="text-faint sm:text-center">{content.location}</p>
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <p className="text-faint">
              © {new Date().getFullYear()} {content.name}
            </p>
            <a href="#top" aria-label="Back to top" className="grid size-8 place-items-center rounded-full border border-line-strong text-faint transition-colors hover:border-accent/60 hover:text-accent">
              <ArrowUp className="size-3.5" />
            </a>
          </div>
        </Reveal>
      </div>
    </footer>
  )
}
