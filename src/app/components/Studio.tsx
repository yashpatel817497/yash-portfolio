import { ArrowDown, ArrowUp, Download, Eye, EyeOff, ImagePlus, LogOut, Plus, RotateCcw, Save, Trash2, Upload, X } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'

import {
  createSection,
  defaultContent,
  normalizeContent,
  safeHref,
  SECTION_LABELS,
  SECTION_TYPES,
  type Project,
  type Section,
  type SectionType,
  type Social,
  type Theme,
} from '../../data/content'
import { useContent } from '../lib/content-store'
import { cx } from '../lib/cx'

const inputClass =
  'w-full rounded-[9px] border border-line-strong bg-bg/70 px-2.5 py-1.5 text-[12.5px] leading-relaxed text-fg outline-none transition-colors placeholder:text-faint focus:border-accent/70'

function Field({ label, value, onChange, area = false, rows = 2 }: { label: string; value: string; onChange: (value: string) => void; area?: boolean; rows?: number }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-faint">{label}</span>
      {area ? (
        <textarea value={value} rows={rows} onChange={(event) => onChange(event.target.value)} className={cx(inputClass, 'resize-y')} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} />
      )}
    </label>
  )
}

/** Commits on blur so typing a separator never destroys the caret. */
function ListInput({ label, value, onChange, separator = ', ' }: { label: string; value: string[]; onChange: (value: string[]) => void; separator?: string }) {
  const [text, setText] = useState(value.join(separator))
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-faint">{label}</span>
      <textarea
        value={text}
        rows={separator === '\n' ? 4 : 2}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => onChange(text.split(separator.trim() === '' ? '\n' : separator.trim()).map((item) => item.trim()).filter(Boolean))}
        className={cx(inputClass, 'resize-y')}
      />
    </label>
  )
}

function Group({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group rounded-[12px] border border-line bg-white/[0.02]">
      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted [&::-webkit-details-marker]:hidden">
        {title}
        <Plus className="size-3 transition-transform group-open:rotate-45" />
      </summary>
      <div className="space-y-2 border-t border-line p-3">{children}</div>
    </details>
  )
}

function IconButton({ label, onClick, disabled = false, danger = false, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'grid size-6 place-items-center rounded-[6px] border border-transparent text-faint transition-colors hover:border-line-strong hover:text-fg disabled:opacity-25',
        danger && 'hover:text-accent-3',
      )}
    >
      {children}
    </button>
  )
}

function ImageField({ label, value, onChange, hint }: { label: string; value: string; onChange: (value: string) => void; hint?: string }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const upload = async (file: File) => {
    setBusy(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const response = await fetch('/api/media', { method: 'POST', body: form })
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!response.ok || !data.url) throw new Error(data.error ?? 'Upload failed.')
      onChange(data.url)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-faint">{label}</span>
      <div className="flex items-center gap-1.5">
        {value ? (
          <img src={safeHref(value)} alt="" className="h-11 w-14 shrink-0 rounded-[6px] border border-line bg-bg object-cover" />
        ) : (
          <span className="grid h-11 w-14 shrink-0 place-items-center rounded-[6px] border border-dashed border-line-strong text-faint">
            <ImagePlus className="size-4" />
          </span>
        )}
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="upload a photo or paste a URL" className={inputClass} />
        <button
          type="button"
          aria-label="Upload image"
          title="Upload an image"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="grid size-8 shrink-0 place-items-center rounded-[7px] border border-accent/40 bg-accent/10 text-accent transition-colors hover:bg-accent/20 disabled:opacity-40"
        >
          <Upload className="size-3.5" />
        </button>
        {value && (
          <button
            type="button"
            aria-label="Remove image"
            title="Remove image"
            onClick={() => onChange('')}
            className="grid size-8 shrink-0 place-items-center rounded-[7px] border border-line-strong text-faint transition-colors hover:text-accent-3"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      {hint && <p className="mt-1 font-mono text-[9px] leading-relaxed text-faint">{hint}</p>}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void upload(file)
          event.target.value = ''
        }}
      />
      {(busy || error) && <p className="mt-1 font-mono text-[9px] text-faint">{busy ? 'uploading…' : error}</p>}
    </div>
  )
}

function LinksEditor({ links, onChange }: { links: Social[]; onChange: (links: Social[]) => void }) {
  return (
    <div className="space-y-1.5">
      <span className="block font-mono text-[9px] uppercase tracking-[0.14em] text-faint">Links</span>
      {links.map((link, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <input
            value={link.label}
            onChange={(event) => onChange(links.map((item, i) => (i === index ? { ...item, label: event.target.value } : item)))}
            placeholder="Label"
            className={cx(inputClass, 'w-24 shrink-0')}
          />
          <input
            value={link.href}
            onChange={(event) => onChange(links.map((item, i) => (i === index ? { ...item, href: event.target.value } : item)))}
            placeholder="https://"
            className={inputClass}
          />
          <IconButton label="Remove link" danger onClick={() => onChange(links.filter((_, i) => i !== index))}>
            <Trash2 className="size-3" />
          </IconButton>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...links, { label: 'Link', href: 'https://' }])} className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-accent">
        <Plus className="size-3" /> add link
      </button>
    </div>
  )
}

function SectionEditor({
  section,
  index,
  count,
  onChange,
  onRemove,
  onMove,
}: {
  section: Section
  index: number
  count: number
  onChange: (next: Section) => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
}) {
  return (
    <div className={cx('rounded-[10px] border border-line bg-bg/40 px-2 py-1.5', !section.visible && 'opacity-55')}>
      <div className="flex items-center gap-1">
        <details className="min-w-0 flex-1">
          <summary className="flex cursor-pointer list-none items-center gap-2 py-1 [&::-webkit-details-marker]:hidden">
            <span className="shrink-0 rounded-[4px] border border-line-strong px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-faint">
              {SECTION_LABELS[section.type]}
            </span>
            <span className="truncate text-[11.5px] text-muted">{section.navLabel || section.heading || section.id}</span>
          </summary>

          <div className="space-y-2 pb-2 pt-1">
            {section.type === 'hero' && (
              <p className="font-mono text-[9px] leading-relaxed text-faint">The hero reads the profile fields below. Hide or delete it like any other section.</p>
            )}
            <Field label="Menu label (blank hides it from the nav)" value={section.navLabel} onChange={(navLabel) => onChange({ ...section, navLabel })} />
            <Field label="Eyebrow" value={section.eyebrow} onChange={(eyebrow) => onChange({ ...section, eyebrow })} />
            <Field label="Heading (enter = new line)" area value={section.heading} onChange={(heading) => onChange({ ...section, heading })} />
            <Field
              label={section.type === 'custom' ? 'Body (blank line = new paragraph)' : 'Intro note'}
              area
              rows={section.type === 'custom' ? 6 : 3}
              value={section.note}
              onChange={(note) => onChange({ ...section, note })}
            />
            {(section.type === 'custom' || section.type === 'about') && (
              <ImageField
                label={section.type === 'about' ? 'Profile photo' : 'Section image'}
                value={section.image}
                hint={
                  section.type === 'about'
                    ? 'Shown in the About section. Upload a photo or paste an image URL; remove it to show your initials.'
                    : 'Optional image shown beside this section, or a link target.'
                }
                onChange={(image) => onChange({ ...section, image })}
              />
            )}
            {section.type === 'custom' && <LinksEditor links={section.links} onChange={(links) => onChange({ ...section, links })} />}
          </div>
        </details>

        <div className="flex shrink-0 items-center">
          <IconButton label="Move section up" disabled={index === 0} onClick={() => onMove(-1)}>
            <ArrowUp className="size-3" />
          </IconButton>
          <IconButton label="Move section down" disabled={index === count - 1} onClick={() => onMove(1)}>
            <ArrowDown className="size-3" />
          </IconButton>
          <IconButton label={section.visible ? 'Hide section' : 'Show section'} onClick={() => onChange({ ...section, visible: !section.visible })}>
            {section.visible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
          </IconButton>
          <IconButton label="Delete section" danger onClick={onRemove}>
            <Trash2 className="size-3" />
          </IconButton>
        </div>
      </div>
    </div>
  )
}

function ProjectEditor({
  project,
  onChange,
  onRemove,
  onMove,
  isFirst,
  isLast,
}: {
  project: Project
  onChange: (next: Project) => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
  isFirst: boolean
  isLast: boolean
}) {
  return (
    <details className="group rounded-[12px] border border-line bg-white/[0.02]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden">
        <span className="truncate text-[12px] text-fg">{project.title || 'Untitled'}</span>
        <span className="shrink-0 font-mono text-[9.5px] text-faint">{project.year}</span>
      </summary>
      <div className="space-y-2 border-t border-line p-3">
        <Field label="Title" value={project.title} onChange={(title) => onChange({ ...project, title })} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Category" value={project.category} onChange={(category) => onChange({ ...project, category })} />
          <Field label="Year" value={project.year} onChange={(year) => onChange({ ...project, year })} />
        </div>
        <Field label="Summary" area value={project.summary} onChange={(summary) => onChange({ ...project, summary })} />
        <Field label="Description (blank line = new paragraph)" area rows={5} value={project.description} onChange={(description) => onChange({ ...project, description })} />
        <ListInput label="Tags" value={project.tags} onChange={(tags) => onChange({ ...project, tags })} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Live link" value={project.link ?? ''} onChange={(link) => onChange({ ...project, link })} />
          <Field label="Repo link" value={project.repo ?? ''} onChange={(repo) => onChange({ ...project, repo })} />
        </div>
        <ImageField
          label="Project image"
          value={project.image ?? ''}
          hint="Shown on the project card and in its detail view. Leave blank for the generated art."
          onChange={(image) => onChange({ ...project, image })}
        />
        <label className="block">
          <span className="mb-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
            Accent hue <span className="text-muted">{project.hue}</span>
          </span>
          <input
            type="range"
            min={0}
            max={359}
            value={project.hue}
            onChange={(event) => onChange({ ...project, hue: Number(event.target.value) })}
            className="w-full accent-[var(--color-accent)]"
          />
        </label>
        <div className="flex items-center gap-1.5 pt-1">
          <button type="button" disabled={isFirst} onClick={() => onMove(-1)} className="rounded-[7px] border border-line-strong px-2 py-1 font-mono text-[9.5px] text-muted transition-colors hover:text-fg disabled:opacity-30">
            ↑ up
          </button>
          <button type="button" disabled={isLast} onClick={() => onMove(1)} className="rounded-[7px] border border-line-strong px-2 py-1 font-mono text-[9.5px] text-muted transition-colors hover:text-fg disabled:opacity-30">
            ↓ down
          </button>
          <button type="button" onClick={onRemove} className="ml-auto inline-flex items-center gap-1 rounded-[7px] border border-accent-3/40 px-2 py-1 font-mono text-[9.5px] text-accent-3/90 transition-colors hover:bg-accent-3/10">
            <Trash2 className="size-3" /> delete
          </button>
        </div>
      </div>
    </details>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">{label}</span>
      <span className="flex items-center gap-1.5">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="size-7 cursor-pointer rounded-[6px] border border-line-strong bg-transparent p-0.5" />
        <input value={value} onChange={(event) => onChange(event.target.value)} className={cx(inputClass, 'w-[88px] font-mono text-[10.5px]')} />
      </span>
    </label>
  )
}

function LoginSettings() {
  const { user, changeLogin } = useContent()
  const [username, setUsername] = useState(user?.name ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (busy) return
    setBusy(true)
    setMessage('')
    const error = await changeLogin(currentPassword, username, nextPassword)
    setBusy(false)
    if (error) {
      setMessage(error)
      return
    }
    setCurrentPassword('')
    setNextPassword('')
    setMessage('Login updated.')
  }

  return (
    <div className="space-y-2">
      <Field label="Username" value={username} onChange={setUsername} />
      <Field label="Current password" value={currentPassword} onChange={setCurrentPassword} />
      <Field label="New password (blank keeps it)" value={nextPassword} onChange={setNextPassword} />
      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy || !currentPassword}
        className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-accent disabled:opacity-40"
      >
        {busy ? 'saving…' : 'update login'}
      </button>
      {message && <p className="font-mono text-[9px] text-faint">{message}</p>}
    </div>
  )
}

export function Studio({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { content, update, saveNow, reload, dirty, saving, saved, error, user, signOut } = useContent()
  const [notice, setNotice] = useState('')
  const [newType, setNewType] = useState<SectionType>('custom')
  const fileRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const setProject = (id: string, next: Project) => update({ projects: content.projects.map((project) => (project.id === id ? next : project)) })

  const addProject = () =>
    update({
      projects: [
        ...content.projects,
        {
          id: `project-${Date.now()}`,
          title: 'New project',
          category: 'Project',
          year: String(new Date().getFullYear()),
          summary: 'One line about what it does.',
          description: 'What the problem was.\n\nWhat you built and how.\n\nWhat changed as a result.',
          tags: ['Python'],
          link: '',
          repo: '',
          hue: 356,
        },
      ],
    })

  const removeProject = (id: string) => {
    if (!window.confirm('Delete this project?')) return
    update({ projects: content.projects.filter((project) => project.id !== id) })
  }

  const moveProject = (index: number, direction: -1 | 1) => {
    const next = [...content.projects]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    update({ projects: next })
  }

  const setSections = (sections: Section[]) => update({ sections })

  const setSection = (id: string, next: Section) => setSections(content.sections.map((section) => (section.id === id ? next : section)))

  const removeSection = (section: Section) => {
    if (!window.confirm(`Delete the "${section.navLabel || SECTION_LABELS[section.type]}" section? Its fields go with it.`)) return
    setSections(content.sections.filter((item) => item.id !== section.id))
  }

  const moveSection = (index: number, direction: -1 | 1) => {
    const next = [...content.sections]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    setSections(next)
  }

  const addSection = (type: SectionType) => {
    setSections([...content.sections, createSection(type)])
    setNotice(`Added a ${SECTION_LABELS[type].toLowerCase()} section.`)
  }

  const setTheme = (patch: Partial<Theme>) => update({ theme: { ...content.theme, ...patch } })

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'portfolio-content.json'
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice('Exported portfolio-content.json')
  }

  const importJson = async (file: File) => {
    try {
      const parsed = normalizeContent(JSON.parse(await file.text()))
      update(parsed)
      setNotice('Imported. Check the page, then save.')
    } catch {
      setNotice('That file is not valid JSON.')
    }
  }

  const resetAll = () => {
    if (!window.confirm('Reset every section, project and colour to the defaults?')) return
    update(defaultContent)
    setNotice('Defaults restored. Saving…')
  }

  const statusLabel = saving ? 'saving…' : dirty ? 'unsaved' : saved ? 'saved' : ''
  const heading = content.footerHeading

  return (
    <aside className="fixed bottom-0 right-0 top-0 z-[79] flex w-[min(440px,100vw)] flex-col border-l border-line-strong bg-[#070708]/97 shadow-2xl backdrop-blur-2xl">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="text-[13px] font-medium text-fg">Studio</p>
          <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
            {user?.name ?? 'admin'} · {statusLabel || 'all changes live'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => void saveNow()}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-1 rounded-[7px] border border-accent/40 bg-accent/10 px-2.5 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-accent transition-colors hover:bg-accent/20 disabled:opacity-40"
          >
            <Save className="size-3" /> save
          </button>
          <button type="button" onClick={() => onOpenChange(false)} aria-label="Close studio" className="grid size-7 place-items-center rounded-full border border-line-strong text-muted transition-colors hover:text-fg">
            <X className="size-3.5" />
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        <Group title={`Page sections (${content.sections.length})`} open>
          {content.sections.map((section, index) => (
            <SectionEditor
              key={section.id}
              section={section}
              index={index}
              count={content.sections.length}
              onChange={(next) => setSection(section.id, next)}
              onRemove={() => removeSection(section)}
              onMove={(direction) => moveSection(index, direction)}
            />
          ))}
          <div className="flex items-center gap-1.5 pt-1">
            <select
              value={newType}
              onChange={(event) => setNewType(event.target.value as SectionType)}
              className={cx(inputClass, 'flex-1')}
              aria-label="Section type to add"
            >
              {SECTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {SECTION_LABELS[type]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => addSection(newType)}
              className="inline-flex shrink-0 items-center gap-1 rounded-[8px] border border-accent/40 bg-accent/10 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-accent transition-colors hover:bg-accent/20"
            >
              <Plus className="size-3" /> add
            </button>
          </div>
          <p className="font-mono text-[9px] leading-relaxed text-faint">Use the eye to hide a section, the arrows to reorder, and the bin to delete it.</p>
        </Group>

        <Group title="Colours">
          <ColorField label="Background" value={content.theme.bg} onChange={(bg) => setTheme({ bg })} />
          <ColorField label="Surface" value={content.theme.surface} onChange={(surface) => setTheme({ surface })} />
          <ColorField label="Text" value={content.theme.fg} onChange={(fg) => setTheme({ fg })} />
          <ColorField label="Accent" value={content.theme.accent} onChange={(accent) => setTheme({ accent })} />
          <ColorField label="Second accent" value={content.theme.accent2} onChange={(accent2) => setTheme({ accent2 })} />
          <button type="button" onClick={() => setTheme(defaultContent.theme)} className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted hover:text-accent">
            reset to red / black
          </button>
        </Group>

        <Group title="Profile & contact">
          <Field label="Name" value={content.name} onChange={(name) => update({ name })} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Role" value={content.role} onChange={(role) => update({ role })} />
            <Field label="Location" value={content.location} onChange={(location) => update({ location })} />
          </div>
          <ListInput label="Rotating titles" value={content.titles} onChange={(titles) => update({ titles })} />
          <Field label="Intro" area rows={3} value={content.intro} onChange={(intro) => update({ intro })} />
          <ListInput label="Bio (one paragraph per line)" separator="\n" value={content.bio} onChange={(bio) => update({ bio })} />
          <Field label="Email (blank hides the email buttons)" value={content.email} onChange={(email) => update({ email })} />
          <Field label="Phone (optional)" value={content.phone} onChange={(phone) => update({ phone })} />
          <ImageField
            label="Fallback profile photo"
            value={content.portrait}
            hint="Used in the About section when that section has no photo of its own."
            onChange={(portrait) => update({ portrait })}
          />
          <Field label="Footer heading (enter = new line)" area value={heading} onChange={(footerHeading) => update({ footerHeading })} />
          <Field label="Footer note" value={content.footerNote} onChange={(footerNote) => update({ footerNote })} />
          <label className="flex items-center gap-2 pt-1 text-[12px] text-muted">
            <input type="checkbox" checked={content.available} onChange={(event) => update({ available: event.target.checked })} className="size-3.5 accent-[var(--color-accent)]" />
            Available for new work
          </label>
        </Group>

        <Group title={`Projects (${content.projects.length})`}>
          {content.projects.map((project, index) => (
            <ProjectEditor
              key={project.id}
              project={project}
              onChange={(next) => setProject(project.id, next)}
              onRemove={() => removeProject(project.id)}
              onMove={(direction) => moveProject(index, direction)}
              isFirst={index === 0}
              isLast={index === content.projects.length - 1}
            />
          ))}
          <button type="button" onClick={addProject} className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-[9px] border border-accent/40 bg-accent/5 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-accent transition-colors hover:bg-accent/10">
            <Plus className="size-3" /> add project
          </button>
        </Group>

        <Group title={`Stats (${content.stats.length})`}>
          {content.stats.map((stat, index) => (
            <div key={index} className="flex items-end gap-1.5">
              <div className="w-20 shrink-0">
                <Field label="Value" value={stat.value} onChange={(value) => update({ stats: content.stats.map((item, i) => (i === index ? { ...item, value } : item)) })} />
              </div>
              <div className="flex-1">
                <Field label="Label" value={stat.label} onChange={(label) => update({ stats: content.stats.map((item, i) => (i === index ? { ...item, label } : item)) })} />
              </div>
              <IconButton label="Remove stat" danger onClick={() => update({ stats: content.stats.filter((_, i) => i !== index) })}>
                <Trash2 className="size-3" />
              </IconButton>
            </div>
          ))}
          <button type="button" onClick={() => update({ stats: [...content.stats, { value: '00', label: 'new stat' }] })} className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-accent">
            <Plus className="size-3" /> add stat
          </button>
        </Group>

        <Group title={`Contact links (${content.socials.length})`}>
          <p className="font-mono text-[9px] leading-relaxed text-faint">
            Each link is shown in the footer and beside your bio. Use mailto:you@example.com or tel:+91... for email and phone entries.
          </p>
          {content.socials.map((social, index) => (
            <div key={index} className="flex items-end gap-1.5">
              <div className="w-24 shrink-0">
                <Field label="Label" value={social.label} onChange={(label) => update({ socials: content.socials.map((item, i) => (i === index ? { ...item, label } : item)) })} />
              </div>
              <div className="flex-1">
                <Field label="URL" value={social.href} onChange={(href) => update({ socials: content.socials.map((item, i) => (i === index ? { ...item, href } : item)) })} />
              </div>
              <IconButton label="Remove social" danger onClick={() => update({ socials: content.socials.filter((_, i) => i !== index) })}>
                <Trash2 className="size-3" />
              </IconButton>
            </div>
          ))}
          <button type="button" onClick={() => update({ socials: [...content.socials, { label: 'Email', href: 'mailto:' }] })} className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-accent">
            <Plus className="size-3" /> add contact
          </button>
        </Group>

        <Group title={`Skills (${content.skills.length})`}>
          <ListInput label="One skill per line" separator="\n" value={content.skills} onChange={(skills) => update({ skills })} />
        </Group>

        <Group title="Admin login">
          <LoginSettings />
        </Group>
      </div>

      <footer className="border-t border-line p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={exportJson} className="inline-flex items-center gap-1.5 rounded-[8px] border border-line-strong px-2.5 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-fg">
            <Download className="size-3" /> export
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-[8px] border border-line-strong px-2.5 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-fg">
            <Upload className="size-3" /> import
          </button>
          <button type="button" onClick={resetAll} className="inline-flex items-center gap-1.5 rounded-[8px] border border-line-strong px-2.5 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-accent-3">
            <RotateCcw className="size-3" /> reset
          </button>
          <button type="button" onClick={() => void reload()} className="inline-flex items-center gap-1.5 rounded-[8px] border border-line-strong px-2.5 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-fg">
            reload
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="ml-auto inline-flex items-center gap-1.5 rounded-[8px] border border-line-strong px-2.5 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-faint transition-colors hover:text-fg"
          >
            <LogOut className="size-3" /> sign out
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void importJson(file)
              event.target.value = ''
            }}
          />
        </div>
        <p className="mt-2 font-mono text-[9px] leading-relaxed tracking-[0.06em] text-faint">{notice || error || 'Changes save to the site after a moment. Export a JSON copy to keep one.'}</p>
      </footer>
    </aside>
  )
}
