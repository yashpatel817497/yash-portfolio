import { useState } from 'react'

import { About } from './components/About'
import { Cursor } from './components/Cursor'
import { CustomSection } from './components/CustomSection'
import { Footer } from './components/Footer'
import { Hero } from './components/Hero'
import { Nav } from './components/Nav'
import { ScrollProgress } from './components/ScrollProgress'
import { SkillsMarquee } from './components/SkillsMarquee'
import { Studio } from './components/Studio'
import { Work } from './components/Work'
import { ContentProvider, useContent } from './lib/content-store'
import type { Section } from '../data/content'

function SectionView({ section }: { section: Section }) {
  if (section.type === 'hero') return <Hero section={section} />
  if (section.type === 'work') return <Work section={section} />
  if (section.type === 'about') return <About section={section} />
  if (section.type === 'skills') return <SkillsMarquee section={section} />
  return <CustomSection section={section} />
}

function Site() {
  const { content, status, canEdit, error, reload } = useContent()
  const [editing, setEditing] = useState(false)

  if (status === 'loading') {
    return (
      <div className="grid min-h-[100svh] place-items-center">
        <div className="flex flex-col items-center gap-4">
          <span className="relative grid size-9 place-items-center rounded-[10px] border border-accent/40 bg-accent/10">
            <span className="size-1.5 animate-ping rounded-full bg-accent" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">loading</span>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="grid min-h-[100svh] place-items-center px-6">
        <div className="max-w-sm text-center">
          <p className="font-display text-[28px]">{content.name}</p>
          <p className="mt-3 text-[14px] leading-relaxed text-muted">The site content could not be loaded just now.</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="mt-6 rounded-full border border-line-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-fg transition-colors hover:border-accent/60 hover:text-accent"
          >
            try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <ScrollProgress />
      <Cursor />
      <Nav editing={editing} onToggleEdit={() => setEditing((value) => !value)} />
      <main>
        {content.sections.filter((section) => section.visible).map((section) => (
          <SectionView key={section.id} section={section} />
        ))}
      </main>
      <Footer />
      {canEdit && <Studio open={editing} onOpenChange={setEditing} />}
      {error && canEdit && (
        <p role="status" className="fixed bottom-4 left-1/2 z-[85] -translate-x-1/2 rounded-full border border-accent-3/50 bg-bg/95 px-4 py-2 font-mono text-[10.5px] text-accent-3 shadow-lg backdrop-blur">
          {error}
        </p>
      )}
    </>
  )
}

export function App() {
  return (
    <ContentProvider>
      <Site />
    </ContentProvider>
  )
}
