import { ArrowUpRight, LogIn, LogOut, Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useContent } from '../lib/content-store'
import { cx } from '../lib/cx'
import { AuthDialog } from './AuthDialog'

export function Nav({ editing, onToggleEdit }: { editing: boolean; onToggleEdit: () => void }) {
  const { content, canEdit, user, signOut } = useContent()
  const [scrolled, setScrolled] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = content.sections
    .filter((section) => section.visible && section.navLabel.trim())
    .slice(0, 5)
    .map((section) => ({ href: `#${section.id === 'hero' ? 'top' : section.id}`, label: section.navLabel }))

  return (
    <header
      className={cx(
        'fixed inset-x-0 top-0 z-40 border-b transition-all duration-500',
        scrolled ? 'border-line/80 bg-bg/75 backdrop-blur-xl' : 'border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-5 sm:px-8">
        <a href="#top" className="group flex min-w-0 items-center gap-2.5">
          <span className="relative grid size-7 shrink-0 place-items-center rounded-[9px] border border-accent/35 bg-accent/10">
            <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
          </span>
          <span className="hidden truncate text-[14px] font-medium tracking-tight sm:inline">{content.name}</span>
        </a>

        <nav className="flex items-center gap-4 sm:gap-6">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="link-draw hidden text-[13.5px] text-muted transition-colors hover:text-fg sm:inline">
              {link.label}
            </a>
          ))}

          {canEdit && (
            <button
              type="button"
              onClick={onToggleEdit}
              aria-expanded={editing}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] transition-colors',
                editing ? 'border-accent/60 bg-accent/10 text-accent' : 'border-line-strong text-muted hover:border-accent/50 hover:text-fg',
              )}
            >
              <Pencil className="size-3" />
              Studio
            </button>
          )}

          {!canEdit && !user && (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-[12px] text-muted transition-colors hover:border-accent/50 hover:text-fg"
            >
              <LogIn className="size-3" />
              Sign in
            </button>
          )}

          {user && (
            <button
              type="button"
              onClick={() => void signOut()}
              title={`Signed in as ${user.name}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-[12px] text-faint transition-colors hover:text-fg"
            >
              <LogOut className="size-3" />
              {user.name}
            </button>
          )}

          <a
            href={content.email ? `mailto:${content.email}` : '#contact'}
            className="group inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3.5 py-1.5 text-[12.5px] text-fg transition-colors hover:border-accent/60 hover:bg-accent/10 hover:text-accent"
          >
            Contact
            <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        </nav>
      </div>

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  )
}
