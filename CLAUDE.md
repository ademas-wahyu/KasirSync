# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KasirSync is a multi-branch POS (Point of Sale) system with centralized catalog management and inventory tracking. Built as a monorepo with a Hono backend (Prisma + SQLite) and a React frontend (Vite + Tailwind CSS).

- **Super Admin** manages branches, users, catalog, and sees all analytics
- **Branch Manager** manages their branch's users, menu availability, inventory, and sees branch analytics
- **Cashier** processes sales at their assigned branch

## Tech Stack

| Layer | Tech |
|-------|------|
| Runtime | Bun |
| API framework | Hono v4 (typed with `AppEnv` generics) |
| ORM | Prisma v7 (`prisma-client` generator, `@prisma/adapter-libsql`) |
| Database | SQLite via Turso/libSQL |
| Auth | `jsonwebtoken` HS256, `bcryptjs` |
| Validation | Zod v4 (`@hono/zod-validator`) |
| Frontend | React 19, TypeScript 6.0, Vite 8, Tailwind CSS v4 |
| Testing | Bun native test runner (`bun test` via `app.request()`) |

## Commands

### Root-level (monorepo)

```bash
bun install                         # Install all dependencies (workspaces hoist to root)
bun run dev                         # Run all workspaces in parallel (backend + frontend)
```

### Backend

```bash
cd apps/backend

bun run dev                         # Start dev server with --hot at http://localhost:3000
bun run seed                        # Run prisma/seed.ts

# Testing (requires test database setup)
bun run test:db:setup               # Apply migrations to test.db
bun test                            # Run all tests
bun test tests/auth/login.test.ts   # Run a single test file
bun test --watch                    # Run tests in watch mode

# Prisma CLI
bunx prisma generate                # Generate Prisma Client after schema changes (output: src/generated/prisma/)
bunx prisma migrate dev             # Create/apply development migrations
bunx prisma migrate dev --name <name>  # Create a named migration
bunx prisma db seed                 # Seed database via prisma.config.ts
bunx prisma studio                  # Open Prisma Studio GUI
bunx prisma validate                # Validate Prisma schema
bunx prisma format                  # Format Prisma schema
```

### Frontend

```bash
cd apps/frontend
bun run dev                         # Start Vite dev server at http://localhost:5173
bun run build                       # tsc -b && vite build
bun run preview                     # Preview production build
bun run lint                        # eslint .
```

## Environment Setup

Three env files live in `apps/backend/`:

- `.env` — development (uses `file:./dev.db`)
- `.env.test` — testing (uses `file:./test.db`, port 3001, separate DB)
- `.env.example` / `.env.test.example` — templates

`JWT_SECRET` is validated at startup (min 32 chars). Tests assert `DATABASE_URL` contains `test.db` as a safety guard.

To run tests for the first time:
```bash
cd apps/backend
cp .env.test.example .env.test
bun run test:db:setup     # creates test.db with latest migrations
bun test                  # runs all test files
```

## Project Structure

```
KasirSync/
  plan.md                           # Detailed development roadmap (Phases 1-14)
  apps/
    backend/                        # API server (Hono + Prisma + SQLite)
      src/
        index.ts                    # Entry point — Bun.serve({ fetch: app.fetch })
        app.ts                      # Hono app factory — routes, middleware, CORS, error handlers
        config/
          env.ts                    # Zod-validated env vars (PORT, DATABASE_URL, JWT_SECRET, etc.)
        lib/
          prisma.ts                 # PrismaClient singleton with LibSQL adapter
        middleware/
          auth.ts                   # JWT Bearer token verification middleware (re-fetches user from DB)
          require-role.ts           # Role-based access control middleware factory
        modules/
          auth/                     # POST /api/v1/auth/login — full .route.ts + .service.ts + .schema.ts
          admin/                    # RBAC + branch scope test endpoints (auth → requireRole → resolveBranchId)
          health/                   # GET /api/v1/health
        shared/
          errors/app-error.ts       # AppError class (status, code, message, details)
          auth/resolve-branch-id.ts # Branch scope enforcement helper
          http/handlers.ts          # Global notFoundHandler & errorHandler
        types/
          app-env.ts                # Hono Variables type — authUser: { id, name, email, role, branchId, isActive }
        generated/prisma/           # Auto-generated Prisma Client
      prisma/
        schema.prisma               # Database schema (11 models: Branch, User, Category, MenuItem, ...)
        seed.ts                     # Seed data (dev branch, 3 users with bcrypt-hashed passwords)
        migrations/                 # Migration history
      prisma.config.ts              # Prisma CLI config (schema path, migration path, seed command)
      tests/
        helper/
          auth-fixtures.ts          # Test DB setup — creates 2 branches + 3 users, guards against non-test DB
        auth/
          login.test.ts             # Login flow tests (success, normalization, inactive user, JWT payload)
          authentication.test.ts    # Auth middleware tests (missing/expired/invalid token, user deactivation)
          authorization.test.ts     # Role middleware tests (access by role)
          branch-scope.test.ts      # Branch scope tests (cross-branch denial, super admin flexibility)
        health.test.ts              # Health endpoint smoke test
    frontend/                       # SPA (React + Vite + Tailwind CSS v4)
      src/
        main.tsx                    # React root mount
        App.tsx                     # Root component (fetches /api on mount)
        index.css                   # @import 'tailwindcss'
      vite.config.ts                # Vite config (API proxy /api → localhost:3000)
      eslint.config.js              # ESLint flat config (TS, React, React Hooks)
```

## Key Conventions

### API Response Format

- Success: `{ data: { ... } }`
- Error: `{ error: { code: "ERROR_CODE", message: "...", details?: [...] } }`
- Error codes: `INVALID_REQUEST` (400/422), `UNAUTHORIZED` (401 malformed header), `AUTH_EXPIRED` (401), `AUTH_INVALID` (401), `ROLE_FORBIDDEN` (403), `ROUTE_NOT_FOUND` (404), `INTERNAL_SERVER_ERROR` (500)

### Hono Patterns

- App is created via `new Hono<AppEnv>()` where `AppEnv` has typed `Variables: { authUser: AuthUser }`
- Route modules export a named Hono router (`authRoutes`, `healthRoutes`), mounted in `app.ts` with `app.route('/api/v1/<module>', router)`
- Global middleware chain: `logger()`, `secureHeaders()`, CORS (scoped to `/api/*` with env-configured `FRONTEND_URL`)
- Per-route middleware composition: route `.use('*', auth)` then individual handlers stack `.get('/', requireRole(...), handler)`
- `app.notFound(notFoundHandler)` and `app.onError(errorHandler)` are set at the end of `app.ts` — these always run
- Direct route `.onError()` would shadow the global one; avoid it by using the errorHandler in `app.ts`
- Error handling: throw `AppError(status, code, message, details?)` in route handlers/services; global `errorHandler` catches them and returns typed JSON

### Auth & Authorization Architecture

Three layers applied in sequence:

1. **`auth` middleware** — Extracts Bearer token, verifies HS256 JWT, looks up the user from DB (re-fetches every request), rejects inactive users, sets `c.set('authUser', user)`. JWT payload contains only `sub` (user ID) — no role, no email — so user state is always current.

2. **`requireRole('SUPER_ADMIN', 'BRANCH_MANAGER')`** — Checks `authUser.role` against allowed roles. Returns 403 if not permitted. Works on any route that has `auth` applied upstream.

3. **`resolveBranchId(authUser, requestedBranchId?)`** — Super Admin can access any branch (must pass `branchId`). Branch Manager/Cashier are locked to their own `authUser.branchId`. Returns 403 on cross-branch access, 422 if Super Admin omits `branchId`.

Login flow specifics:
- Email is `.toLowerCase()` normalized via Zod `transform()`
- Error messages are intentionally ambiguous ("Email atau password salah") — same for wrong email, wrong password, or inactive user
- JWT subject is the user UUID (not email, not sequential ID)
- Token expiry is configurable via `JWT_EXPIRED_IN` (default `8h`)

### Prisma & Database

- **Prisma v7** with `generator client { provider = "prisma-client" }` (not `prisma-client-js`). Uses `@prisma/adapter-libsql` — the adapter is passed to `PrismaClient` at construction, not via the old generator
- SQLite via Turso/libSQL. Local: `file:./dev.db`, remote: Turso with `DATABASE_AUTH_TOKEN`
- Monetary values stored as **integers** (Rupiah in smallest unit, no floating point)
- Composite primary keys on join tables (`BranchMenuState`, `MenuRecipe`, `BranchStock`)
- Optimistic concurrency via `version` field on `MenuItem` and `BranchStock`
- Idempotency on sales via `@@unique([branchId, idempotencyKey])`
- `Sale.receiptNumber` is also unique per branch: `@@unique([branchId, receiptNumber])`
- Always import the singleton `prisma` from `src/lib/prisma.ts` — never instantiate `PrismaClient` elsewhere

### Module Pattern

Each backend feature module follows:
```
src/modules/<feature>/
  <feature>.route.ts       # Hono router with endpoints (validation → service call → response)
  <feature>.service.ts     # Business logic (when extracted — see `auth` for reference)
  <feature>.schema.ts      # Zod validation schemas (when extracted — see `auth` for reference)
```

Current modules: `auth`, `admin` (RBAC test endpoints), `health`. New modules should follow this pattern.

The `admin` module demonstrates middleware composition — routes that need auth apply it at the router level with `router.use('*', auth)`, then stack `requireRole()` per-handler.

### Testing Patterns

Tests use Bun's built-in `bun:test` (no Jest/Vitest). They run against a separate `test.db` database.

**Key patterns:**
- `beforeEach` calls `resetAuthFixtures()` which wipes `User` + `Branch` tables and recreates 2 branches + 3 users
- Tests invoke routes via `app.request(path, { method, headers, body })` — no supertest needed
- Auth tests create isolated `Hono` instances with specific middleware stacks to test edge cases
- A guard function `assertTestDatabase()` throws if `NODE_ENV !== 'test'` or `DATABASE_URL` doesn't contain `test.db`
- Test env is loaded from `.env.test` via `--env-file=.env.test` flag in `package.json` scripts

### Development Status (per plan.md)

- ✅ **Phase 1** — Database foundation (schema, migrations, Prisma singleton)
- ✅ **Phase 2** — Initial seed data
- ✅ **Phase 3** — Project structure cleanup
- ✅ **Phase 4** — Auth & RBAC (login, JWT, auth middleware, role middleware, branch scope — all tested)
- ⬜ **Phase 5** — Branch management (CRUD branches)
- ⬜ **Phase 6** — User management (CRUD users, password hashing on create)
- ⬜ **Phase 7** — Centralized catalog (categories, menu items, per-branch availability)
- ⬜ **Phase 8** — Inventory & recipe (ingredients, recipes, stock management)
- ⬜ **Phase 9** — Sales transactions (checkout, history, cancellation, idempotency)
- ⬜ **Phase 10+** — Real-time sync (SSE), analytics, testing, docs, production readiness
