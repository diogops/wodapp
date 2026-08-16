# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`workout-sequencer` — a personal CrossFit workout app for a single owner. The user gets 4 seeded workouts (A–D, transcribed from a source PDF), runs them one at a time in a locked mobile "workout mode", marks them completed/skipped, reorders the queue, and imports new workouts from a PDF via LLM extraction. **All UI copy and user-facing error messages are in Brazilian Portuguese** — keep new strings in pt-BR.

Originally scaffolded from the Manus `web-db-user` template, then migrated off that platform entirely (see *Migration history* below). Directories named `_core/` (`server/_core/`, `client/src/_core/`, `shared/_core/`) still hold the template's infrastructure layer — auth, Vite wiring, tRPC setup. Prefer adding app code outside `_core/`.

Deployed on Railway: project `workout-sequencer`, service `workout-app` at `https://workout-app-production-a38f.up.railway.app`, with a managed Postgres service and a volume mounted at `/data`.

## Commands

Package manager is **pnpm** (a `wouter` patch and a `nanoid` override are pinned in `package.json`, so `npm install` will drift). Node **≥ 22.12** is required — Vite 7 rejects older runtimes.

```bash
pnpm dev              # tsx watch on server/_core/index.ts, Vite in middleware mode, port 3000
pnpm build            # vite build + esbuild-bundle the server into dist/
pnpm start            # run the production bundle (Railway's start command)
pnpm check            # tsc --noEmit (note: tsconfig excludes **/*.test.ts)
pnpm test             # vitest run (all server + client tests)
pnpm format           # prettier --write .
pnpm db:push          # drizzle-kit generate && drizzle-kit migrate
```

Single test file / single test:

```bash
pnpm vitest run server/workout-router.test.ts
pnpm vitest run -t "imports PDF into a reviewable"
```

**Windows note:** `pnpm dev` and `pnpm start` use the POSIX form `NODE_ENV=... tsx ...`, which PowerShell cannot parse. Run them from the Bash tool, or set `$env:NODE_ENV` and invoke `pnpm exec tsx watch server/_core/index.ts` directly.

## Deploying

Publishing is: **verify → build → commit → push → `railway up` → poll until SUCCESS.** Skipping the poll is the most common way to report a deploy that never landed.

```bash
pnpm check && pnpm test && pnpm build
git add -A && git commit && git push origin main
railway up --detach --service workout-app -m "<summary>"

# railway up returns while the build is still QUEUED. Poll until terminal:
railway deployment list --service workout-app --json     # read [0].status

# Only after SUCCESS, confirm for real:
curl -s https://workout-app-production-a38f.up.railway.app/health   # {"ok":true}
railway logs --service workout-app                                  # "Server running on port 8080"
```

`BUILDING → DEPLOYING → SUCCESS` takes roughly 45–90s.

**Migrations run at boot**, in `runMigrations()` before `listen()` — Railway's Postgres is reachable only on the internal network, so there is nowhere else to apply them. A failed migration means the container never starts, which makes `"Server running on port 8080"` the proof that migrations applied. To create one, note that `drizzle.config.ts` throws without `DATABASE_URL` even though generation never connects, so pass a throwaway value:

```bash
DATABASE_URL="postgresql://x:x@localhost:5432/x" pnpm exec drizzle-kit generate
```

Commit the generated `.sql` **and** `drizzle/migrations/meta/` — the running app reads them from the repo.

**The GitHub repo is public.** `.env` and `.project-config.json` are gitignored and must stay so; Railway holds the real values (`DATABASE_URL` is the reference `${{Postgres.DATABASE_URL}}`, not a literal). Before a push that touches config:

```bash
git ls-files -z | xargs -0 grep -lIE "sk-ant-|gho_|ghp_|postgres(ql)?://[^ ]*:[^ ]*@"
```

Setting a variable redeploys unless you pass `--skip-deploys`:

```bash
railway variable set KEY=value --service workout-app [--skip-deploys]
```

**Local environment traps** (these are machine-specific, not repo problems): `pnpm` is not on PATH — use `npx pnpm`, and don't retry `corepack enable`, which fails with `EPERM` without admin. Local Node is 20.18.1 while `package.json` requires ≥22.12, so every command prints `Unsupported engine`; that warning is expected and the build still works. `pnpm dev` / `pnpm start` use the POSIX `NODE_ENV=… ` prefix that PowerShell cannot parse — run them from bash. And after editing `tsconfig.json`, delete `node_modules/typescript/tsbuildinfo` before trusting a clean `pnpm check`: the incremental cache silently hides errors.

## Environment

Env vars are read **only** through `server/_core/env.ts`; `.env` is loaded by `dotenv/config` at the top of `server/_core/index.ts`. Names only — values live in `.env` locally and in Railway variables in production:

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres. On Railway it's `${{Postgres.DATABASE_URL}}` (internal network only — no public URL) |
| `JWT_SECRET` | Signs the `app_session_id` session cookie |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth app credentials |
| `OWNER_GITHUB_LOGIN` | The only GitHub login allowed to sign in |
| `ANTHROPIC_API_KEY` | PDF import. Without it, only that one procedure fails |
| `ANTHROPIC_MODEL` | Defaults to `claude-opus-5` |
| `STORAGE_DIR` | Where uploaded PDFs are written (`/data` on Railway, `.storage` locally) |
| `APP_URL` | Public origin; used to build the OAuth redirect URI |

## Architecture

Single Express process serves both the tRPC API and the client. In dev, Vite runs as middleware (`server/_core/vite.ts`); in prod, static files are served from the build output. **There is no separate frontend deployment** — one service, one port, one container.

**Type flow, end to end:** `drizzle/schema.ts` (tables + inferred `User`/`Workout` types) → `server/db.ts` (all queries) → `server/routers.ts` (tRPC procedures + Zod input schemas) → `export type AppRouter` → `client/src/lib/trpc.ts` (`createTRPCReact<AppRouter>`) → components. Changing a table means touching the schema, a migration, `server/db.ts`, and the Zod schema in `routers.ts`. superjson is the transformer on both ends, so `Date` survives the wire.

**Auth** is GitHub OAuth, gated to one person:
- `startLogin()` (`client/src/const.ts`) just navigates to `/api/oauth/login`. The server owns the redirect so `GITHUB_CLIENT_SECRET` never reaches the browser and the CSRF nonce is minted where it's validated.
- `/api/oauth/login` sets a one-time nonce cookie (`__Host-oauth_state`, or `oauth_state` over plain http) and redirects to GitHub.
- `/api/oauth/callback` (`server/_core/oauth.ts`) checks the nonce, exchanges the code, fetches the GitHub user, **rejects anyone whose login isn't `OWNER_GITHUB_LOGIN`**, upserts, and sets the `app_session_id` JWT cookie.
- `server/_core/sdk.ts` is deliberately provider-agnostic: it only signs/verifies sessions and resolves the user. Swapping GitHub for another identity provider touches `oauth.ts` and nothing else.
- Procedure tiers live in `server/_core/trpc.ts`: `publicProcedure`, `protectedProcedure` (narrows `ctx.user` to non-null), `adminProcedure`. Everything under `workouts` is `protectedProcedure` and scopes every query by `ctx.user.id`.

**Data model** is a three-level tree: `workouts` → `workoutSections` → `workoutExercises`, each ordered by an explicit `orderIndex` integer. There are no FK constraints or cascades — `server/db.ts` hand-assembles the tree (one query per level, then in-memory grouping in `getWorkoutsForUser`) and hand-deletes children in `deleteWorkout`. Separately, `workoutSessions` records completed/skipped events with a JSON `snapshot` of the workout at that moment, so history stays accurate after edits.

Consequences worth knowing before changing this area:
- `getDb()` **throws** when `DATABASE_URL` is missing. It used to return `null`, which made reads degrade to empty lists with no visible error — do not reintroduce that.
- Migrations run at **boot** (`runMigrations()` in `server/_core/index.ts`, before `listen`). Railway's Postgres has no public endpoint, so this is the only place they can be applied. A failed migration prevents startup, which is intended.
- `workouts.update` is **delete-and-recreate**, not an UPDATE: it creates a new workout at the old `orderIndex`, then deletes the old one. The workout ID changes, and prior `workoutSessions` rows keep pointing at the dead ID.
- `ensureDefaultWorkouts` seeds the four hardcoded `DEFAULT_WORKOUTS` in `server/db.ts` on a user's first `workouts.list` call. Those are real CrossFit programming transcribed from a PDF (see `phase1_findings.txt`) — don't casually reword them.

**PDF import** (`workouts.importPdf`) writes the file to the volume via `server/storage.ts`, then sends the same bytes to the Anthropic Messages API as a base64 `document` block with a `json_schema` output constraint (`server/llm.ts`). The result is still validated against `workoutSchema` — a schema-constrained response is well-formed, not necessarily correct. It deliberately **does not persist**: it returns a draft the user reviews in the UI before calling `workouts.create`.

**Storage** is plain disk on the Railway volume. `resolveStoragePath` canonicalizes the key and rejects anything escaping `STORAGE_DIR`; the `/files/*` route (`server/_core/storageProxy.ts`) requires a valid session before serving. Exercise demo images are *not* in storage — they're static assets in `client/public/demos/`.

**Client** is a single-route app: `App.tsx` routes `/` to `client/src/pages/Home.tsx`, ~740 lines holding all three tabs (`today` / `library` / `history`) plus the create/edit/import dialogs. `client/src/lib/` holds the pure, unit-tested logic extracted out of it (`workoutSelection.ts`, `workoutMode.ts`). `client/src/components/ui/` is stock shadcn/ui (new-york, neutral) — regenerate via `components.json` rather than hand-editing. Several template components (`AIChatBox`, `Map`, `ManusDialog`, `DashboardLayout`) are unused leftovers that still typecheck.

The "today" tab picks a **random** pending workout (`chooseRandomWorkoutIndex`), not the next sequential one; completing or skipping re-rolls, excluding the current index. If every workout is completed, it falls back to the full list.

## Workout mode: the locked-viewport contract

The `today` tab applies a `workout-mode` class that locks global scroll (`html:has(.workout-mode)` in `client/src/index.css`) and pins toolbar → card header → scrollable body → action footer inside one viewport. **Only `.workout-card-body` may scroll**; everything else is `flex: 0 0 auto`. On mobile the global app header is hidden entirely and the progress counter lives in the session toolbar, so the chrome is one bar instead of three.

Two traps in this area:
- **`CardTitle` renders a `div`, not an `h3`** (`client/src/components/ui/card.tsx`). CSS targeting `.workout-card h3` silently misses the workout title. Target `[data-slot="card-title"]`.
- **shadcn's `Card` ships `py-6` and `gap-6`.** Workout mode zeroes both; if you restyle the card, keep that or ~96px of dead space returns on mobile.

The contract is enforced by *source-text assertions*, not by rendering: `client/src/lib/workoutDemo.contract.test.ts` reads `Home.tsx`, `index.css`, and `card.tsx` with `readFileSync` and greps for literal class strings, element order, and CSS rules. Renaming a class, reordering the header/body/footer JSX, or reflowing that CSS breaks tests in a way that looks unrelated to the change. Read that test before touching the workout-mode layout, and update it deliberately when the layout genuinely changes.

Manual mobile validation is tracked in `workout-mode-checklist.md`; the running task list is `todo.md`; the product spec is `doc/workout-sequencer-prompt-para-agente-local.md`.

## Testing conventions

Vitest, `environment: "node"` — there is no jsdom and no React Testing Library. Three styles in use:

1. **Router tests** (`server/workout-router.test.ts`): `vi.hoisted()` mock objects for `./db`, `./storage`, `./llm`, then `appRouter.createCaller(ctx)` with a hand-built `TrpcContext` carrying a fake user. This is the way to test procedures — no HTTP, no database.
2. **Schema tests** (`server/workout-format.test.ts`): parse/reject cases against the exported `workoutSchema`.
3. **Pure-logic and contract tests** (`client/src/lib/*.test.ts`): plain function assertions, plus the source-grep contract test described above.

Path aliases `@/*` → `client/src/*` and `@shared/*` → `shared/*` are defined in three places (`tsconfig.json`, `vite.config.ts`, `vitest.config.ts`) and must stay in sync.

## Style

Prettier with `arrowParens: "avoid"`, double quotes, 80-col — but note that `server/db.ts`, `server/routers.ts`, and much of `Home.tsx` are written in a deliberately dense single-line style that Prettier would reflow, and `.prettierignore` does not cover them. Don't run `pnpm format` across those files as a drive-by; match the surrounding density instead.

## Migration history

The app used three Manus platform services that stop working off-platform. Each was replaced; the details matter if you hit leftovers:

| Was | Now |
|---|---|
| MySQL / TiDB Cloud | Postgres on Railway (`drizzle-orm/pg-core`, `pg` driver) |
| Manus OAuth (`api.manus.im`) | GitHub OAuth, owner-gated |
| Forge presigned S3 | Disk on a Railway volume |
| Forge LLM gateway | Anthropic Messages API directly |

Leftovers that are still around: `template.json` and `client/public/__manus__/` (inert), `server/_core/types/manusTypes.ts`, and the unused template components listed above. `.project-config.json` holds the old Manus credentials and is gitignored — do not commit it; the repo is public.
