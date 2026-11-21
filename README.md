# Portfolio

A dark, animated single-page portfolio for an AI/ML engineer, in red and
black: a canvas neural-net hero, a selected-work grid with case-study
overlays, an about section with a parallax portrait, skill marquees, and a
built-in Studio for the site owner.

## What is editable

Everything on the page comes from one JSON document in D1: profile copy,
rotating titles, bio, portrait, stats, socials, skills, projects, footer
copy, the palette, and the **page sections themselves** — add a hero, work,
about, skills or free-form custom section, then reorder, hide or delete it.
Menu links are generated from the visible sections.

Only the site admin can write. Visitors get a read-only page, and the Worker
rejects every write that is not from a signed-in admin on the site's own
origin.

## Run it

```sh
bun install
bun run dev        # http://localhost:5173 — local D1 + R2
bun run build      # dist/client (assets) + dist/portfolio/index.js (Worker)
bun run typecheck
bun test tests
```

Local development uses `.dev.vars` (gitignored). The first time you open
the local site, click **Sign in** and create the admin login; it is stored in
the local D1 database.

## Sign in

The site has its own username and password, stored as a PBKDF2-SHA256 hash in
D1 — never in the page, the client bundle or an environment variable.

- On a fresh site, **Sign in** opens a one-time *Create your admin login*
  form. The first account created becomes the only admin and the setup form
  closes for good.
- Later visits use the same form with **Sign in**; a successful sign-in sets
  an `HttpOnly`, signed session cookie valid for seven days.
- Studio has an **Admin login** panel to change the username or password
  (the current password is required, and changing it ends other sessions).
- Six wrong passwords within fifteen minutes block that client for fifteen
  minutes.
- Forgotten password: delete the `admin` row in the D1 database and the
  one-time setup form returns.

The Worker checks the session on every write, and every write is also
same-origin checked: visitors get a read-only page.

## API

| Route | Who | What |
| --- | --- | --- |
| `GET /api/content` | public | the full content document + revision |
| `PUT /api/content` | admin | replace it, with a revision check (409 on conflict) |
| `GET /api/session` | public | signed-in user, `canEdit`, `configured`, `needsSetup` |
| `POST /api/auth/setup` | first visit only | create the admin username + password |
| `POST /api/auth/login` | public | password sign-in; sets the session cookie |
| `POST /api/auth/logout` | public | clears the session cookie |
| `POST /api/auth/credentials` | admin | change the username or password |
| `POST /api/media` | admin | upload an image to R2 (5MB limit) |
| `GET /api/media/:key` | public | serve an uploaded image |

Writes are same-origin checked, body-limited and validated by
`normalizeContent` in `src/data/content.ts` — the same module the client uses,
so an old or hand-edited document cannot break the page.

## Layout

- `src/worker/index.ts` — Hono Worker: password auth and session cookies,
  content API, uploads, D1 schema bootstrap.
- `src/data/content.ts` — content types, defaults, section factory and
  normalization.
- `src/app/lib/content-store.tsx` — loads content and session, applies the
  theme, autosaves admin edits.
- `src/app/components/Studio.tsx` — the admin panel.
- `src/app/components/*` — `Hero`, `Work`, `About`, `SkillsMarquee`,
  `CustomSection`, `Footer`, plus `ParticleField`, `Cursor`,
  `ScrollProgress`.
- `src/styles.css` — black canvas, red accent, Bricolage Grotesque display
  type.

Motion respects `prefers-reduced-motion`.

## Deploy with Freebuff Sites

`deploy.json` points at the build output. The site needs a D1 binding named
`DB` and an R2 binding named `FILES`; then `bun run build` and deploy with
the `sites_deploy` tool. No auth provider or environment variables are
needed.
