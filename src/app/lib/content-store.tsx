import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

import { defaultContent, type Content } from '../../data/content'

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

const ContentContext = createContext<Store | null>(null)

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<Content>(defaultContent)
  const [status, setStatus] = useState<Store['status']>('ready')

  const reload = useCallback(async () => {
    setContent(defaultContent)
    setStatus('ready')
  }, [])

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
  }, [])

  const saveNow = useCallback(async (): Promise<boolean> => false, [])
  const signIn = useCallback(async (): Promise<string> => 'Studio editing is disabled on static hosting.', [])
  const signUp = useCallback(async (): Promise<string> => 'Studio editing is disabled on static hosting.', [])
  const signOut = useCallback(async () => {}, [])
  const changeLogin = useCallback(async (): Promise<string> => 'Studio editing is disabled on static hosting.', [])

  return (
    <ContentContext.Provider
      value={{
        content,
        status,
        canEdit: false,
        configured: false,
        needsSetup: false,
        user: null,
        dirty: false,
        saving: false,
        saved: false,
        error: '',
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
