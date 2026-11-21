import { KeyRound, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'

import { useContent } from '../lib/content-store'
import { cx } from '../lib/cx'

const inputClass =
  'w-full rounded-[9px] border border-line-strong bg-bg/70 px-3 py-2 text-[13px] text-fg outline-none transition-colors placeholder:text-faint focus:border-accent/70'

export function AuthDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { needsSetup, signIn, signUp } = useContent()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const usernameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setPassword('')
    setConfirm('')
    setError('')
    const timer = window.setTimeout(() => usernameRef.current?.focus(), 40)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    if (needsSetup && password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setBusy(true)
    setError('')
    const message = needsSetup ? await signUp(username, password) : await signIn(username, password)
    setBusy(false)
    if (message) {
      setError(message)
      return
    }
    setUsername('')
    setPassword('')
    setConfirm('')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[95] grid place-items-center bg-black/70 px-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="w-full max-w-[360px] rounded-2xl border border-line-strong bg-[#08080a] p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-[9px] border border-accent/40 bg-accent/10 text-accent">
              <KeyRound className="size-4" />
            </span>
            <div>
              <h2 id="auth-title" className="text-[15px] font-medium tracking-tight text-fg">
                {needsSetup ? 'Create your admin login' : 'Admin sign in'}
              </h2>
              <p className="mt-0.5 text-[11.5px] leading-snug text-faint">
                {needsSetup ? 'Only the owner should do this. It can be done once.' : 'Only the admin can edit this page.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign in"
            className="grid size-7 shrink-0 place-items-center rounded-full border border-line-strong text-muted transition-colors hover:text-fg"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-2.5">
          <label className="block">
            <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-faint">Username</span>
            <input
              ref={usernameRef}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-faint">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={needsSetup ? 'new-password' : 'current-password'}
              required
              className={inputClass}
            />
          </label>

          {needsSetup && (
            <label className="block">
              <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-faint">Confirm password</span>
              <input
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="new-password"
                required
                className={inputClass}
              />
            </label>
          )}

          {error && <p role="alert" className="text-[11.5px] leading-snug text-accent-3">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className={cx(
              'mt-1 inline-flex w-full items-center justify-center gap-2 rounded-[9px] border border-accent/50 bg-accent/15 px-3 py-2 text-[12.5px] font-medium text-accent transition-colors hover:bg-accent/25',
              busy && 'opacity-60',
            )}
          >
            {busy ? 'checking…' : needsSetup ? 'Create login' : 'Sign in'}
          </button>

          {needsSetup && (
            <p className="text-center font-mono text-[9px] leading-relaxed tracking-[0.06em] text-faint">
              use at least 8 characters. stored hashed, never in the page.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
