import { expect, test } from 'bun:test'

import worker from '../src/worker/index'

interface Row {
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

function fakeDb() {
  const content = new Map<string, Row>()
  const admin = new Map<string, AdminRow>()
  const attempts = new Map<string, AttemptRow>()

  const prepare = (sql: string) => {
    let args: unknown[] = []
    const statement = {
      bind(...next: unknown[]) {
        args = next
        return statement
      },
      async first() {
        if (sql.includes('FROM content')) {
          const row = content.get(String(args[0]))
          return row ? { ...row } : null
        }
        if (sql.includes('FROM admin')) {
          return admin.get(String(args[0])) ?? null
        }
        if (sql.includes('FROM login_attempts')) {
          return attempts.get(String(args[0])) ?? null
        }
        return null
      },
      async run() {
        if (sql.includes('INSERT INTO content')) {
          content.set(String(args[0]), { body: String(args[1]), revision: Number(args[2]), updated_at: Number(args[3]) })
        } else if (sql.includes('UPDATE content')) {
          content.set('site', { body: String(args[0]), revision: Number(args[1]), updated_at: Number(args[2]) })
        } else if (sql.includes('INSERT OR IGNORE INTO admin')) {
          const id = String(args[0])
          if (!admin.has(id)) {
            admin.set(id, {
              id,
              username: String(args[1]),
              salt: String(args[2]),
              hash: String(args[3]),
              iterations: Number(args[4]),
              epoch: Number(args[5]),
              updated_at: Number(args[6]),
            })
          }
        } else if (sql.includes('epoch = epoch + 1')) {
          const row = admin.get(String(args[0]))
          if (row) admin.set(row.id, { ...row, epoch: row.epoch + 1 })
        } else if (sql.includes('UPDATE admin')) {
          const id = String(args[5])
          const row = admin.get(id)
          if (row) {
            admin.set(id, {
              ...row,
              username: String(args[0]),
              salt: String(args[1]),
              hash: String(args[2]),
              iterations: Number(args[3]),
              updated_at: Number(args[4]),
            })
          }
        } else if (sql.includes('INSERT INTO login_attempts')) {
          attempts.set(String(args[0]), { fails: Number(args[1]), first_at: Number(args[2]), blocked_until: Number(args[3]) })
        } else if (sql.includes('DELETE FROM login_attempts')) {
          attempts.delete(String(args[0]))
        }
        return { success: true, meta: { changes: 1 } }
      },
    }
    return statement
  }

  return {
    prepare,
    batch: async (statements: unknown[]) => Promise.all(statements),
  } as unknown as D1Database
}

function env() {
  return {
    ASSETS: { fetch: async () => new Response('asset') },
    DB: fakeDb(),
  } as never
}

const req = (path: string, init?: RequestInit) => new Request(`https://example.test${path}`, init)

const json = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  req(path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })

const cookieOf = (response: Response) => (response.headers.get('set-cookie') ?? '').split(';')[0]

const PASSWORD = 'correct-horse-battery'

async function createLogin(bindings: ReturnType<typeof env>) {
  const response = await worker.fetch(json('/api/auth/setup', { username: 'owner', password: PASSWORD }), bindings)
  return { response, cookie: cookieOf(response) }
}

test('content is public and seeded from the defaults', async () => {
  const response = await worker.fetch(req('/api/content'), env())
  expect(response.status).toBe(200)
  const data = (await response.json()) as { content: { name: string; sections: unknown[] }; revision: number; canEdit: boolean }
  expect(data.content.name).toBeString()
  expect(data.content.sections.length).toBeGreaterThan(0)
  expect(data.revision).toBe(1)
  expect(data.canEdit).toBe(false)
})

test('a fresh site asks for a login, and it can only be created once', async () => {
  const bindings = env()

  const fresh = await worker.fetch(req('/api/session'), bindings)
  const before = (await fresh.json()) as { canEdit: boolean; configured: boolean; needsSetup: boolean }
  expect(before.canEdit).toBe(false)
  expect(before.configured).toBe(false)
  expect(before.needsSetup).toBe(true)

  const { response, cookie } = await createLogin(bindings)
  expect(response.status).toBe(200)
  expect(cookie.startsWith('portfolio_admin=')).toBe(true)

  const again = await worker.fetch(json('/api/auth/setup', { username: 'other', password: PASSWORD }), bindings)
  expect(again.status).toBe(403)

  const signedIn = await worker.fetch(req('/api/session', { headers: { Cookie: cookie } }), bindings)
  const data = (await signedIn.json()) as { user: { name: string } | null; canEdit: boolean; needsSetup: boolean }
  expect(data.user?.name).toBe('owner')
  expect(data.canEdit).toBe(true)
  expect(data.needsSetup).toBe(false)
})

test('sign in needs the right username and password', async () => {
  const bindings = env()
  await createLogin(bindings)

  const wrongPassword = await worker.fetch(json('/api/auth/login', { username: 'owner', password: 'nope-nope' }), bindings)
  expect(wrongPassword.status).toBe(401)

  const wrongUsername = await worker.fetch(json('/api/auth/login', { username: 'intruder', password: PASSWORD }), bindings)
  expect(wrongUsername.status).toBe(401)

  const correct = await worker.fetch(json('/api/auth/login', { username: 'owner', password: PASSWORD }), bindings)
  expect(correct.status).toBe(200)
  expect(cookieOf(correct).startsWith('portfolio_admin=')).toBe(true)

  const anonymous = await worker.fetch(req('/api/session'), bindings)
  expect(((await anonymous.json()) as { canEdit: boolean }).canEdit).toBe(false)
})

test('writing requires the admin session and the site origin', async () => {
  const bindings = env()
  const { cookie } = await createLogin(bindings)

  const anonymous = await worker.fetch(
    req('/api/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: {}, revision: 1 }) }),
    bindings,
  )
  expect(anonymous.status).toBe(401)

  const foreign = await worker.fetch(
    req('/api/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Origin: 'https://evil.test', Cookie: cookie },
      body: JSON.stringify({ content: {}, revision: 1 }),
    }),
    bindings,
  )
  expect(foreign.status).toBe(403)

  const first = await worker.fetch(
    req('/api/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ content: { name: 'Edited Name' }, revision: 1 }),
    }),
    bindings,
  )
  expect(first.status).toBe(200)
  expect(((await first.json()) as { revision: number }).revision).toBe(2)

  const read = await worker.fetch(req('/api/content'), bindings)
  expect(((await read.json()) as { content: { name: string } }).content.name).toBe('Edited Name')

  const stale = await worker.fetch(
    req('/api/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ content: { name: 'Stale' }, revision: 1 }),
    }),
    bindings,
  )
  expect(stale.status).toBe(409)
})

test('signing out ends the session', async () => {
  const bindings = env()
  const { cookie } = await createLogin(bindings)

  const out = await worker.fetch(req('/api/auth/logout', { method: 'POST', headers: { Cookie: cookie } }), bindings)
  expect(out.status).toBe(200)

  const write = await worker.fetch(
    req('/api/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ content: {}, revision: 1 }),
    }),
    bindings,
  )
  expect(write.status).toBe(401)
})

test('repeated wrong passwords are throttled', async () => {
  const bindings = env()
  await createLogin(bindings)

  const statuses: number[] = []
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await worker.fetch(json('/api/auth/login', { username: 'owner', password: `wrong-${attempt}` }), bindings)
    statuses.push(response.status)
  }
  expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401])
  expect(statuses[5]).toBe(429)
})

test('changing credentials requires the current password', async () => {
  const bindings = env()
  const { cookie } = await createLogin(bindings)

  const refused = await worker.fetch(
    req('/api/auth/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ currentPassword: 'wrong', password: 'new-password-1' }),
    }),
    bindings,
  )
  expect(refused.status).toBe(403)

  const changed = await worker.fetch(
    req('/api/auth/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ currentPassword: PASSWORD, password: 'new-password-1' }),
    }),
    bindings,
  )
  expect(changed.status).toBe(200)

  const oldPassword = await worker.fetch(json('/api/auth/login', { username: 'owner', password: PASSWORD }), bindings)
  expect(oldPassword.status).toBe(401)

  const newPassword = await worker.fetch(json('/api/auth/login', { username: 'owner', password: 'new-password-1' }), bindings)
  expect(newPassword.status).toBe(200)
})

test('an admin without image storage is told so instead of failing silently', async () => {
  const bindings = env()
  const { cookie } = await createLogin(bindings)
  const response = await worker.fetch(req('/api/media', { method: 'POST', headers: { Cookie: cookie } }), bindings)
  expect(response.status).toBe(503)
})

test('oversized requests and unknown API routes never fall through to HTML', async () => {
  const bindings = env()
  const { cookie } = await createLogin(bindings)

  const oversized = await worker.fetch(
    req('/api/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: 'x'.repeat(600 * 1024),
    }),
    bindings,
  )
  expect(oversized.status).toBe(413)

  const missing = await worker.fetch(req('/api/missing'), bindings)
  expect(missing.status).toBe(404)
  expect(((await missing.json()) as { error: string }).error).toBeString()
})
