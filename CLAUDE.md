# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`workout-sequencer` — a personal CrossFit workout app (single user per account). Users get 4 seeded workouts (A–D, from a source PDF), run them one at a time in a locked mobile "workout mode", mark them completed/skipped, reorder the queue, and import new workouts from a PDF via LLM extraction. **All UI copy and user-facing error messages are in Brazilian Portuguese** — keep new strings in pt-BR.

Scaffolded from the Manus `web-db-user` template (`template.json`, `.project-config.json`). Anything under a `_core/` directory (`server/_core/`, `client/src/_core/`, `shared/_core/`) is template infrastructure — auth, LLM, storage, Vite wiring. Treat it as vendored: prefer adding app code outside `_core/`.

## Commands

Package manager is **pnpm** (a `wouter` patch and a `nanoid` override are pinned in `package.json`, so `npm install` will drift).

```bash
pnpm dev              # tsx watch on server/_core/index.ts, Vite in middleware mode, port 3000 (auto-bumps if busy)
pnpm build            # vite build + esbuild-bundle the server into dist/
pnpm start            # run the production bundle
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

**Windows note:** `pnpm dev` uses the POSIX form `NODE_ENV=development tsx ...`, which PowerShell cannot parse. Run it from the Bash tool, or set `$env:NODE_ENV="development"` and invoke `pnpm exec tsx watch server/_core/index.ts` directly.

Env vars come from `.env` (`dotenv/config` is imported first in `server/_core/index.ts`) and are read only through `server/_core/env.ts`. Required: `DATABASE_URL` (TiDB/MySQL), `JWT_SECRET`, `OAUTH_SERVER_URL`, `VITE_APP_ID`, `OWNER_OPEN_ID`, `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`. The template's original values live in `.project-config.json`.

## Architecture

Single Express process serves both the tRPC API and the client. In dev, Vite runs as middleware (`server/_core/vite.ts`); in prod, static files are served from the build output.

**Type flow, end to end:** `drizzle/schema.ts` (tables + inferred `User`/`Workout` types) → `server/db.ts` (all queries) → `server/routers.ts` (tRPC procedures + Zod input schemas) → `export type AppRouter` → `client/src/lib/trpc.ts` (`createTRPCReact<AppRouter>`) → components. Changing a table means touching the schema, a migration, `server/db.ts`, and the Zod schema in `routers.ts`. superjson is the transformer on both ends, so `Date` survives the wire.

**Auth** is Manus OAuth, not local passwords:
- `startLogin()` in `client/src/const.ts` mints a nonce, writes the `__Host-oauth_state` cookie, and navigates. It has side effects — never call it during render.
- `/api/oauth/callback` (`server/_core/oauth.ts`) checks the nonce against that cookie (CSRF guard), exchanges the code, upserts the user, and sets the `app_session_id` JWT cookie.
- `createContext` calls `sdk.authenticateRequest`, which accepts the cookie **or** an `Authorization: Bearer` header — the header path exists because iframe previews on Safari/WebView block cookies and the runtime mirrors the session into `sessionStorage["manus-cookie"]`.
- Procedure tiers live in `server/_core/trpc.ts`: `publicProcedure`, `protectedProcedure` (narrows `ctx.user` to non-null), `adminProcedure`. Everything under `workouts` is `protectedProcedure` and scopes every query by `ctx.user.id`.

**Data model** is a three-level tree: `workouts` → `workoutSections` → `workoutExercises`, each ordered by an explicit `orderIndex` integer. There are no FK constraints or cascades — `server/db.ts` hand-assembles the tree (one query per level, then in-memory grouping in `getWorkoutsForUser`) and hand-deletes children in `deleteWorkout`. Separately, `workoutSessions` records completed/skipped events with a JSON `snapshot` of the workout at that moment, so history stays accurate after edits.

Consequences worth knowing before changing this area:
- `getDb()` returns `null` when `DATABASE_URL` is unset. Read paths degrade to `[]`/`undefined`; write paths throw `"Database unavailable"`.
- `workouts.update` is **delete-and-recreate**, not an UPDATE: it creates a new workout at the old `orderIndex`, then deletes the old one. The workout ID changes, and prior `workoutSessions` rows keep pointing at the dead ID.
- `ensureDefaultWorkouts` seeds the four hardcoded `DEFAULT_WORKOUTS` in `server/db.ts` on a user's first `workouts.list` call. Those are real CrossFit programming transcribed from a PDF (see `phase1_findings.txt`) — don't casually reword them.

**PDF import** (`workouts.importPdf`) uploads the file through `server/storage.ts` (Forge presigned PUT → S3), passes the resulting URL to `invokeLLM` with a strict `json_schema` response format, then validates the result against `workoutSchema`. It deliberately **does not persist** — it returns a draft the user reviews in the UI before calling `workouts.create`. Uploaded files are served back through the `/manus-storage/*` proxy (`server/_core/storageProxy.ts`), which 307-redirects to a freshly signed URL.

**Client** is a single-route app: `App.tsx` routes `/` to `client/src/pages/Home.tsx`, ~740 lines holding all three tabs (`today` / `library` / `history`) plus the create/edit/import dialogs. `client/src/lib/` holds the pure, unit-tested logic extracted out of it (`workoutSelection.ts`, `workoutMode.ts`). `client/src/components/ui/` is stock shadcn/ui (new-york, neutral) — regenerate via `components.json` rather than hand-editing.

The "today" tab picks a **random** pending workout (`chooseRandomWorkoutIndex`), not the next sequential one; completing or skipping re-rolls, excluding the current index. If every workout is completed, it falls back to the full list.

## Workout mode: the locked-viewport contract

The `today` tab applies a `workout-mode` class that locks global scroll (`html:has(.workout-mode)` in `client/src/index.css`) and pins header → card header → scrollable body → action footer inside one viewport. **Only `.workout-card-body` may scroll**; everything else is `flex: 0 0 auto`.

This contract is enforced by *source-text assertions*, not by rendering: `client/src/lib/workoutDemo.contract.test.ts` reads `Home.tsx` and `index.css` with `readFileSync` and greps for literal class strings, element order, and CSS rules (e.g. `min-height: 2rem` on footer buttons, `calc(100svh - 2.15rem)` under the mobile media query). Renaming a class, reordering the header/body/footer JSX, or reflowing that CSS breaks tests in a way that looks unrelated to the change. Read that test before touching the workout-mode layout, and update it deliberately when the layout genuinely changes.

Manual mobile validation is tracked in `workout-mode-checklist.md`; the running task list is `todo.md`.

## Testing conventions

Vitest, `environment: "node"` — there is no jsdom and no React Testing Library. Three styles in use:

1. **Router tests** (`server/workout-router.test.ts`): `vi.hoisted()` mock objects for `./db`, `./storage`, `./_core/llm`, then `appRouter.createCaller(ctx)` with a hand-built `TrpcContext` carrying a fake user. This is the way to test procedures — no HTTP, no database.
2. **Schema tests** (`server/workout-format.test.ts`): parse/reject cases against the exported `workoutSchema`.
3. **Pure-logic and contract tests** (`client/src/lib/*.test.ts`): plain function assertions, plus the source-grep contract test described above.

Path aliases `@/*` → `client/src/*` and `@shared/*` → `shared/*` are defined in three places (`tsconfig.json`, `vite.config.ts`, `vitest.config.ts`) and must stay in sync.

## Style

Prettier with `arrowParens: "avoid"`, double quotes, 80-col — but note that `server/db.ts`, `server/routers.ts`, and much of `Home.tsx` are written in a deliberately dense single-line style that Prettier would reflow. Don't run `pnpm format` across those files as a drive-by; match the surrounding density instead.
