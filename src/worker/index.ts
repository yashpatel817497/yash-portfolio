import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'

import { defaultContent, normalizeContent } from '../data/content'

interface Env {
  ASSETS: Fetcher
  DB: D1Database
  FILES?: R2Bucket
}

interface DocRow {
  body: string
  revision: number
  updated_at: number
}

interface AdminRow {
  id: string
  username: string
  salt: string
  hash: string
  iterations: number
  epoch: number
  updated_at: number
}

interface AttemptRow {
  fails: number
  first_at: number
  blocked_until: number
}

const CONTENT_ID = 'site'
const DOC_BYTES = 512 * 1024
const MEDIA_BYTES = 5 * 1024 * 1024
const MEDIA_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}

const SESSION_COOKIE = 'portfolio_admin'
const SESSION_TTL = 60 * 60 * 24 * 7
const ADMIN_ID = 'admin'
// Kept low enough to finish inside a Worker's per-request CPU budget; online
// guessing is what the attempt throttling below is for.
const PBKDF2_ITERATIONS = 15_000
const MIN_PASSWORD = 8
const MAX_FAILURES = 6
const FAILURE_WINDOW = 15 * 60 * 1000
const BLOCK_TIME = 15 * 60 * 1000

const app = new Hono<{ Bindings: Env }>()

app.use('/api/*', bodyLimit({ maxSize: DOC_BYTES, onError: (c) => c.json({ error: 'Request is too large.' }, 413) }))

// --- passwords and session cookies ---------------------------------------

const encoder = new TextEncoder()

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Compares two strings without leaking where they differ through timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let difference = 0
  for (let i = 0; i < a.length; i += 1) difference |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return difference === 0
}

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<string> {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material, 256)
  return toBase64Url(new Uint8Array(bits))
}

async function sessionKey(row: AdminRow): Promise<CryptoKey> {
  // The stored hash is the signing key, so changing the password ends every
  // existing session without a separate secret to configure.
  return crypto.subtle.importKey('raw', fromBase64Url(row.hash), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

async function issueSession(row: AdminRow): Promise<string> {
  const payload = toBase64Url(
    encoder.encode(JSON.stringify({ u: row.username, e: row.epoch, exp: Math.floor(Date.now() / 1000) + SESSION_TTL })),
  )
  const signature = await crypto.subtle.sign('HMAC', await sessionKey(row), encoder.encode(payload))
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`
}

async function verifySession(env: Env, request: Request): Promise<string | null> {
  const raw = readCookie(request, SESSION_COOKIE)
  if (!raw) return null
  const [payload, signature] = raw.split('.')
  if (!payload || !signature) return null
  const row = await readAdmin(env)
  if (!row) return null
  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await sessionKey(row),
      fromBase64Url(signature),
      encoder.encode(payload),
    )
    if (!valid) return null
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as { u?: unknown; e?: unknown; exp?: unknown }
    if (typeof data.u !== 'string' || typeof data.e !== 'number' || typeof data.exp !== 'number') return null
    if (data.u !== row.username || data.e !== row.epoch) return null
    if (data.exp * 1000 < Date.now()) return null
    return row.username
  } catch {
    return null
  }
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=')
  }
  return null
}

function sessionCookie(request: Request, value: string, maxAge: number): string {
  const secure = new URL(request.url).protocol === 'https:'
  // Secure cookies are cross-site/partitioned so the session also survives the
  // embedded preview panel; every mutation is additionally origin-checked.
  const attributes = [`${SESSION_COOKIE}=${value}`, 'Path=/', 'HttpOnly', `Max-Age=${maxAge}`]
  attributes.push(...(secure ? ['Secure', 'SameSite=None', 'Partitioned'] : ['SameSite=Lax']))
  return attributes.join('; ')
}

function clientKey(request: Request): Promise<string> {
  const ip = (request.headers.get('CF-Connecting-IP') ?? request.headers.get('X-Forwarded-For') ?? 'local').split(',')[0].trim()
  return crypto.subtle.digest('SHA-256', encoder.encode(ip)).then((digest) => toBase64Url(new Uint8Array(digest)))
}

// --- storage ------------------------------------------------------------

let schemaReady: Promise<void> | null = null

function database(env: Env): D1Database {
  const db = env.DB
  if (!db) throw new Error('The content database is not configured.')
  schemaReady ??= db
    .batch([
      db.prepare('CREATE TABLE IF NOT EXISTS content (id TEXT PRIMARY KEY, body TEXT NOT NULL, revision INTEGER NOT NULL, updated_at INTEGER NOT NULL)'),
      db.prepare('CREATE TABLE IF NOT EXISTS admin (id TEXT PRIMARY KEY, username TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL, iterations INTEGER NOT NULL, epoch INTEGER NOT NULL, updated_at INTEGER NOT NULL)'),
      db.prepare('CREATE TABLE IF NOT EXISTS login_attempts (ip TEXT PRIMARY KEY, fails INTEGER NOT NULL, first_at INTEGER NOT NULL, blocked_until INTEGER NOT NULL)'),
    ])
    .then(() => undefined)
    .catch((error: unknown) => {
      schemaReady = null
      throw error
    })
  return db
}

async function readAdmin(env: Env): Promise<AdminRow | null> {
  const db = database(env)
  await schemaReady
  const row = await db
    .prepare('SELECT id, username, salt, hash, iterations, epoch, updated_at FROM admin WHERE id = ?')
    .bind(ADMIN_ID)
    .first<AdminRow>()
  return row ?? null
}

async function readDoc(env: Env): Promise<{ content: ReturnType<typeof normalizeContent>; revision: number; updatedAt: number }> {
  const db = database(env)
  await schemaReady
  const row = await db.prepare('SELECT body, revision, updated_at FROM content WHERE id = ?').bind(CONTENT_ID).first<DocRow>()
  if (row) {
    let parsed: unknown
    try {
      parsed = JSON.parse(row.body)
    } catch {
      parsed = defaultContent
    }
    return { content: normalizeContent(parsed), revision: row.revision, updatedAt: row.updated_at }
  }
  const content = normalizeContent(defaultContent)
  const now = Date.now()
  await db
    .prepare('INSERT INTO content (id, body, revision, updated_at) VALUES (?, ?, ?, ?)')
    .bind(CONTENT_ID, JSON.stringify(content), 1, now)
    .run()
  return { content, revision: 1, updatedAt: now }
}

// --- sign-in throttling -------------------------------------------------

async function throttleState(env: Env, key: string): Promise<{ blockedFor: number; fails: number; firstAt: number }> {
  const db = database(env)
  await schemaReady
  const row = await db
    .prepare('SELECT fails, first_at, blocked_until FROM login_attempts WHERE ip = ?')
    .bind(key)
    .first<AttemptRow>()
  const now = Date.now()
  if (row && row.blocked_until > now) return { blockedFor: row.blocked_until - now, fails: row.fails, firstAt: row.first_at }
  if (row && now - row.first_at <= FAILURE_WINDOW) return { blockedFor: 0, fails: row.fails, firstAt: row.first_at }
  return { blockedFor: 0, fails: 0, firstAt: now }
}

/** Records a failed attempt and reports whether this client is now blocked. */
async function registerFailure(env: Env, key: string): Promise<number> {
  const db = database(env)
  const state = await throttleState(env, key)
  const fails = state.fails + 1
  const blockedUntil = fails >= MAX_FAILURES ? Date.now() + BLOCK_TIME : 0
  await db
    .prepare('INSERT INTO login_attempts (ip, fails, first_at, blocked_until) VALUES (?, ?, ?, ?) ON CONFLICT(ip) DO UPDATE SET fails = excluded.fails, first_at = excluded.first_at, blocked_until = excluded.blocked_until')
    .bind(key, fails, state.firstAt, blockedUntil)
    .run()
  return blockedUntil
}

async function clearFailures(env: Env, key: string): Promise<void> {
  const db = database(env)
  await schemaReady
  await db.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(key).run()
}

// --- session ------------------------------------------------------------

interface SessionState {
  username: string | null
  admin: boolean
  configured: boolean
  needsSetup: boolean
}

async function session(env: Env, request: Request): Promise<SessionState> {
  const row = await readAdmin(env)
  if (!row) return { username: null, admin: false, configured: false, needsSetup: true }
  const username = await verifySession(env, request)
  return { username, admin: username !== null, configured: true, needsSetup: false }
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin')
  if (!origin) return true
  try {
    const requestUrl = new URL(request.url)
    return new URL(origin).origin === requestUrl.origin
  } catch {
    return false
  }
}

// --- routes -------------------------------------------------------------

app.get('/api/health', (c) => c.json({ ok: true }))

app.get('/api/session', async (c) => {
  const current = await session(c.env, c.req.raw)
  return c.json(
    {
      user: current.username ? { name: current.username } : null,
      canEdit: current.admin,
      configured: current.configured,
      needsSetup: current.needsSetup,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
})

app.get('/api/content', async (c) => {
  const doc = await readDoc(c.env)
  const current = await session(c.env, c.req.raw)
  return c.json(
    { content: doc.content, revision: doc.revision, updatedAt: doc.updatedAt, canEdit: current.admin },
    { headers: { 'Cache-Control': 'no-store' } },
  )
})

app.put('/api/content', async (c) => {
  if (!sameOrigin(c.req.raw)) return c.json({ error: 'Cross-origin request refused.' }, 403)
  const current = await session(c.env, c.req.raw)
  if (!current.username) return c.json({ error: 'Sign in required.' }, 401)
  if (!current.admin) return c.json({ error: 'Only the site admin can edit this page.' }, 403)

  const body = await c.req.json<{ content?: unknown; revision?: unknown }>().catch(() => null)
  if (!body || typeof body !== 'object') return c.json({ error: 'Expected a JSON body.' }, 400)
  const revision = typeof body.revision === 'number' ? body.revision : Number.NaN
  if (!Number.isInteger(revision)) return c.json({ error: 'Missing revision.' }, 400)

  const stored = await readDoc(c.env)
  if (stored.revision !== revision) {
    return c.json({ error: 'This page changed somewhere else. Reload to get the latest version.', revision: stored.revision }, 409)
  }

  const content = normalizeContent(body.content)
  const now = Date.now()
  const next = stored.revision + 1
  await database(c.env)
    .prepare('UPDATE content SET body = ?, revision = ?, updated_at = ? WHERE id = ?')
    .bind(JSON.stringify(content), next, now, CONTENT_ID)
    .run()
  return c.json({ revision: next, updatedAt: now }, { headers: { 'Cache-Control': 'no-store' } })
})

app.post('/api/auth/setup', async (c) => {
  if (!sameOrigin(c.req.raw)) return c.json({ error: 'Cross-origin request refused.' }, 403)
  if (await readAdmin(c.env)) return c.json({ error: 'This site already has an admin login.' }, 403)

  const body = await c.req.json<{ username?: unknown; password?: unknown }>().catch(() => null)
  if (!body || typeof body.username !== 'string' || typeof body.password !== 'string') {
    return c.json({ error: 'Enter a username and a password.' }, 400)
  }
  const username = body.username.trim()
  if (username.length < 3 || username.length > 40) return c.json({ error: 'Username must be 3 to 40 characters.' }, 400)
  if (body.password.length < MIN_PASSWORD) return c.json({ error: `Password must be at least ${MIN_PASSWORD} characters.` }, 400)

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derive(body.password, salt, PBKDF2_ITERATIONS)
  const row: AdminRow = {
    id: ADMIN_ID,
    username,
    salt: toBase64Url(salt),
    hash,
    iterations: PBKDF2_ITERATIONS,
    epoch: 1,
    updated_at: Date.now(),
  }
  await database(c.env)
    .prepare('INSERT OR IGNORE INTO admin (id, username, salt, hash, iterations, epoch, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(row.id, row.username, row.salt, row.hash, row.iterations, row.epoch, row.updated_at)
    .run()

  // Two setups can race past the read above; the loser must not overwrite the winner.
  const stored = await readAdmin(c.env)
  if (!stored || stored.hash !== hash) return c.json({ error: 'This site already has an admin login.' }, 409)

  const token = await issueSession(stored)
  return c.json(
    { user: { name: stored.username } },
    200,
    { 'Set-Cookie': sessionCookie(c.req.raw, token, SESSION_TTL), 'Cache-Control': 'private, no-store' },
  )
})

app.post('/api/auth/login', async (c) => {
  if (!sameOrigin(c.req.raw)) return c.json({ error: 'Cross-origin request refused.' }, 403)

  const body = await c.req.json<{ username?: unknown; password?: unknown }>().catch(() => null)
  if (!body || typeof body.username !== 'string' || typeof body.password !== 'string') {
    return c.json({ error: 'Enter a username and a password.' }, 400)
  }

  const key = await clientKey(c.req.raw)
  const throttle = await throttleState(c.env, key)
  if (throttle.blockedFor > 0) {
    return c.json(
      { error: 'Too many attempts. Try again in a few minutes.' },
      429,
      { 'Retry-After': String(Math.ceil(throttle.blockedFor / 1000)), 'Cache-Control': 'private, no-store' },
    )
  }

  const row = await readAdmin(c.env)
  if (!row) return c.json({ error: 'This site has no admin login yet. Create one first.', needsSetup: true }, 503)

  const hash = await derive(body.password, fromBase64Url(row.salt), row.iterations)
  const usernameMatches = safeEqual(body.username.trim().toLowerCase(), row.username.toLowerCase())
  if (!safeEqual(hash, row.hash) || !usernameMatches) {
    const blockedUntil = await registerFailure(c.env, key)
    return c.json(
      { error: blockedUntil > 0 ? 'Too many attempts. Try again in a few minutes.' : 'Wrong username or password.' },
      blockedUntil > 0 ? 429 : 401,
      { 'Cache-Control': 'private, no-store' },
    )
  }

  await clearFailures(c.env, key)
  const token = await issueSession(row)
  return c.json(
    { user: { name: row.username } },
    200,
    { 'Set-Cookie': sessionCookie(c.req.raw, token, SESSION_TTL), 'Cache-Control': 'private, no-store' },
  )
})

app.post('/api/auth/logout', async (c) => {
  if (!sameOrigin(c.req.raw)) return c.json({ error: 'Cross-origin request refused.' }, 403)
  // Only a real session may revoke: otherwise anyone could sign the owner out.
  if (await verifySession(c.env, c.req.raw)) {
    await database(c.env).prepare('UPDATE admin SET epoch = epoch + 1 WHERE id = ?').bind(ADMIN_ID).run()
  }
  return c.json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(c.req.raw, '', 0), 'Cache-Control': 'private, no-store' })
})

app.post('/api/auth/credentials', async (c) => {
  if (!sameOrigin(c.req.raw)) return c.json({ error: 'Cross-origin request refused.' }, 403)
  const current = await session(c.env, c.req.raw)
  if (!current.admin) return c.json({ error: 'Sign in required.' }, 401)
  const row = await readAdmin(c.env)
  if (!row) return c.json({ error: 'This site has no admin login yet.' }, 503)

  const body = await c.req
    .json<{ currentPassword?: unknown; username?: unknown; password?: unknown }>()
    .catch(() => null)
  if (!body || typeof body.currentPassword !== 'string') return c.json({ error: 'Enter your current password.' }, 400)

  const currentHash = await derive(body.currentPassword, fromBase64Url(row.salt), row.iterations)
  if (!safeEqual(currentHash, row.hash)) return c.json({ error: 'Current password is not correct.' }, 403)

  const username = typeof body.username === 'string' && body.username.trim() ? body.username.trim() : row.username
  if (username.length < 3 || username.length > 40) return c.json({ error: 'Username must be 3 to 40 characters.' }, 400)

  const nextPassword = typeof body.password === 'string' ? body.password : ''
  if (nextPassword && nextPassword.length < MIN_PASSWORD) {
    return c.json({ error: `Password must be at least ${MIN_PASSWORD} characters.` }, 400)
  }

  const salt = nextPassword ? crypto.getRandomValues(new Uint8Array(16)) : fromBase64Url(row.salt)
  const hash = nextPassword ? await derive(nextPassword, salt, PBKDF2_ITERATIONS) : row.hash
  const updated: AdminRow = {
    ...row,
    username,
    salt: toBase64Url(salt),
    hash,
    iterations: PBKDF2_ITERATIONS,
    updated_at: Date.now(),
  }
  await database(c.env)
    .prepare('UPDATE admin SET username = ?, salt = ?, hash = ?, iterations = ?, updated_at = ? WHERE id = ?')
    .bind(updated.username, updated.salt, updated.hash, updated.iterations, updated.updated_at, ADMIN_ID)
    .run()

  const token = await issueSession(updated)
  return c.json(
    { user: { name: updated.username } },
    200,
    { 'Set-Cookie': sessionCookie(c.req.raw, token, SESSION_TTL), 'Cache-Control': 'private, no-store' },
  )
})

app.post('/api/media', async (c) => {
  if (!sameOrigin(c.req.raw)) return c.json({ error: 'Cross-origin request refused.' }, 403)
  const current = await session(c.env, c.req.raw)
  if (!current.username) return c.json({ error: 'Sign in required.' }, 401)
  if (!current.admin) return c.json({ error: 'Only the site admin can upload images.' }, 403)
  const bucket = c.env.FILES
  if (!bucket) return c.json({ error: 'Image storage is not configured yet.' }, 503)

  const form = await c.req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return c.json({ error: 'Attach an image file.' }, 400)
  const extension = MEDIA_TYPES[file.type]
  if (!extension) return c.json({ error: 'Use a JPEG, PNG, WebP, GIF or AVIF image.' }, 415)
  if (file.size > MEDIA_BYTES) return c.json({ error: 'Images must be 5MB or smaller.' }, 413)

  const key = `${crypto.randomUUID()}.${extension}`
  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' },
  })
  return c.json({ url: `/api/media/${key}` })
})

app.get('/api/media/:key', async (c) => {
  const key = c.req.param('key')
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp|gif|avif)$/i.test(key)) return c.json({ error: 'Not found.' }, 404)
  const bucket = c.env.FILES
  if (!bucket) return c.json({ error: 'Not found.' }, 404)
  const object = await bucket.get(key)
  if (!object) return c.json({ error: 'Not found.' }, 404)
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  return new Response(object.body, { headers })
})

app.all('/api/*', (c) => c.json({ error: 'Not found.' }, 404))

app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw))

app.onError((error, c) => {
  if (new URL(c.req.url).pathname.startsWith('/api/')) {
    console.error('API error', error instanceof Error ? error.message : 'unknown')
    return c.json({ error: 'Something went wrong on the server.' }, 500)
  }
  return c.text('Something went wrong.', 500)
})

export default {
  fetch(request: Request, env: Env): Response | Promise<Response> {
    return app.fetch(request, env)
  },
}
