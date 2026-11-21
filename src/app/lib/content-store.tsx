import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

import { defaultContent, normalizeContent, type Content } from '../../data/content'

interface Account {
  name: string
}

interface Store {
  content: Content
  status: 'loading' | 'ready' | 'error'
  canEdit: boolean
  configured: boolean
  needsSetup: boolean
  user: Account | null
  dirty: boolean
  saving: boolean
  saved: boolean
  error: string
  update: (patch: Partial<Content>) => void
  saveNow: () => Promise<boolean>
  reload: () => Promise<void>
  signIn: (username: string, password: string) => Promise<string>
  signUp: (username: string, password: string) => Promise<string>
  signOut: () => Promise<void>
  changeLogin: (currentPassword: string, username: string, password: string) => Promise<string>
}

interface SessionData {
  user: Account | null
  canEdit: boolean
  configured: boolean
  needsSetup: boolean
}

const ContentContext = createContext<Store | null>(null)

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  return (await response.json()) as T
}

async function postJson(url: string, body?: unknown): Promise<{ ok: boolean; error: string }> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    })
    if (response.ok) return { ok: true, error: '' }
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    return { ok: false, error: data.error ?? `Request failed (${response.status}).` }
  } catch {
    return { ok: false, error: 'Could not reach the server.' }
  }
}

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<Content>(defaultContent)
  const [status, setStatus] = useState<Store['status']>('loading')
  const [canEdit, setCanEdit] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [user, setUser] = useState<Account | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const contentRef = useRef(content)
  contentRef.current = content
  const revisionRef = useRef(0)
  const canEditRef = useRef(false)
  canEditRef.current = canEdit
  const savingRef = useRef(false)
  const pausedRef = useRef(false)
  const savedTimer = useRef<number | undefined>(undefined)

  const flash = useCallback(() => {
    setSaved(true)
    window.clearTimeout(savedTimer.current)
    savedTimer.current = window.setTimeout(() => setSaved(false), 1600)
  }, [])

  const loadSession = useCallback(async () => {
    try {
      const data = await getJson<SessionData>('/api/session')
      setUser(data.user)
      setCanEdit(data.canEdit)
      setConfigured(data.configured)
      setNeedsSetup(data.needsSetup)
    } catch {
      // Session info is a nicety; the page still renders when it fails.
    }
  }, [])

  const reload = useCallback(async () => {
    try {
      const data = await getJson<{ content: unknown; revision: number; canEdit: boolean }>('/api/content')
      setContent(normalizeContent(data.content))
      revisionRef.current = data.revision
      setCanEdit(data.canEdit)
      pausedRef.current = false
      setDirty(false)
      setError('')
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void Promise.all([reload(), loadSession()])
  }, [reload, loadSession])

  // Picks up a session created in another tab, e.g. after signing in there.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void loadSession()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadSession])

  const saveNow = useCallback(async (): Promise<boolean> => {
    if (!canEditRef.current || pausedRef.current || savingRef.current) return false
    savingRef.current = true
    setSaving(true)
    try {
      const response = await fetch('/api/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contentRef.current, revision: revisionRef.current }),
      })
      if (response.status === 409) {
        pausedRef.current = true
        setError('This page changed in another tab. Reload to pick up the latest version.')
        return false
      }
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        setError(data.error ?? `Could not save (${response.status}).`)
        return false
      }
      const data = (await response.json()) as { revision: number }
      revisionRef.current = data.revision
      setDirty(false)
      setError('')
      flash()
      return true
    } catch {
      setError('Could not reach the server. Your changes are still on screen.')
      return false
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }, [flash])

  useEffect(() => {
    if (!dirty || !canEdit) return
    const timer = window.setTimeout(() => void saveNow(), 900)
    return () => window.clearTimeout(timer)
  }, [content, dirty, canEdit, saveNow])

  useEffect(() => {
    const root = document.documentElement
    const { bg, surface, fg, accent, accent2 } = content.theme
    root.style.setProperty('--color-bg', bg)
    root.style.setProperty('--color-surface', surface)
    root.style.setProperty('--color-fg', fg)
    root.style.setProperty('--color-accent', accent)
    root.style.setProperty('--color-accent-2', accent2)
  }, [content.theme])

  const update = useCallback((patch: Partial<Content>) => {
    setContent((current) => ({ ...current, ...patch }))
    setDirty(true)
    setError('')
  }, [])

  const signIn = useCallback(
    async (username: string, password: string): Promise<string> => {
      const result = await postJson('/api/auth/login', { username, password })
      if (!result.ok) return result.error
      await loadSession()
      await reload()
      return ''
    },
    [loadSession, reload],
  )

  const signUp = useCallback(
    async (username: string, password: string): Promise<string> => {
      const result = await postJson('/api/auth/setup', { username, password })
      if (!result.ok) return result.error
      await loadSession()
      await reload()
      return ''
    },
    [loadSession, reload],
  )

  const signOut = useCallback(async () => {
    await postJson('/api/auth/logout')
    await loadSession()
    await reload()
  }, [loadSession, reload])

  const changeLogin = useCallback(
    async (currentPassword: string, username: string, password: string): Promise<string> => {
      const result = await postJson('/api/auth/credentials', {
        currentPassword,
        username,
        ...(password ? { password } : {}),
      })
      if (!result.ok) return result.error
      await loadSession()
      flash()
      return ''
    },
    [flash, loadSession],
  )

  useEffect(() => () => window.clearTimeout(savedTimer.current), [])

  return (
    <ContentContext.Provider
      value={{
        content,
        status,
        canEdit,
        configured,
        needsSetup,
        user,
        dirty,
        saving,
        saved,
        error,
        update,
        saveNow,
        reload,
        signIn,
        signUp,
        signOut,
        changeLogin,
      }}
    >
      {children}
    </ContentContext.Provider>
  )
}

export function useContent(): Store {
  const store = useContext(ContentContext)
  if (!store) throw new Error('useContent must be used inside <ContentProvider>')
  return store
}
