# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KasirSync is a multi-branch POS (Point of Sale) system with centralized catalog management and inventory tracking. Built as a monorepo with a Hono backend (Prisma + SQLite) and a React frontend (Vite + Tailwind CSS).

- **Super Admin** manages branches, users, catalog, and sees all analytics
- **Branch Manager** manages their branch's users, menu availability, inventory, and sees branch analytics
- **Cashier** processes sales at their assigned branch

## Project Structure

```
KasirSync/
  plan.md                           # Detailed development roadmap (Phases 1-14)
  apps/
    backend/                        # API server (Hono + Prisma + SQLite)
      src/
        index.ts                    # Entry point — Bun.serve({ fetch: app.fetch })
        app.ts                      # Hono app factory — routes, middleware, CORS
        config/
          env.ts                    # Zod-validated env vars (PORT, DATABASE_URL, JWT_SECRET, etc.)
        lib/
          prisma.ts                 # PrismaClient singleton with LibSQL adapter
        middleware/
          auth.ts                   # JWT Bearer token verification middleware
          require-role.ts           # Role-based access control middleware factory
        modules/
          auth/auth.route.ts        # POST /api/v1/auth/login
          admin/admin.route.ts      # Protected admin endpoints
          health/health.route.ts    # GET /api/v1/health
        shared/
          errors/app-error.ts       # AppError class (status, code, message, details)
          http/handlers.ts          # Global notFoundHandler & errorHandler
        types/
          app-env.ts                # Hono Variables type (userId, role)
        generated/prisma/           # Auto-generated Prisma Client
      prisma/
        schema.prisma               # Database schema (11 models)
        seed.ts                     # Seed data (dev branch, users)
        migrations/                 # Migration history
      prisma.config.ts              # Prisma CLI config
    frontend/                       # SPA (React + Vite + Tailwind CSS v4)
      src/
        main.tsx                    # React root mount
        App.tsx                     # Root component
        index.css                   # @import 'tailwindcss'
      vite.config.ts                # Vite config (API proxy to localhost:3000)
      eslint.config.js              # ESLint flat config (TS, React, React Hooks)
```

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

bunx prisma generate                # Generate Prisma Client after schema changes
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

## Key Conventions

### API Response Format

- Success: `{ data: { ... } }`
- Error: `{ error: { code: "ERROR_CODE", message: "...", details?: [...] } }`
- Error codes: `INVALID_REQUEST` (400/422), `AUTH_REQUIRED`/`AUTH_EXPIRED`/`AUTH_INVALID` (401), `ROLE_FORBIDDEN` (403), `ROUTE_NOT_FOUND` (404), `INTERNAL_SERVER_ERROR` (500)

### Hono Patterns

- App is `new Hono<AppEnv>()` with typed Variables (`userId`, `role`)
- Route modules export a named Hono router, mounted in `app.ts` with `app.route('/api/v1/<module>', router)`
- Global middleware: `logger()`, `secureHeaders()`, CORS (scoped to `/api/*`)
- Auth uses `jsonwebtoken` HS256 with 8h expiry. Payload: `{ userId, role }`
- Role middleware: `requireRole('SUPER_ADMIN', 'BRANCH_MANAGER')` — returns 403 if unauthorized
- Error handling: throw `AppError(status, code, message)` in route handlers; global `errorHandler` catches them

### Prisma & Database

- **Prisma v7** with `@prisma/adapter-libsql` (requires `PrismaLibSql` adapter, not the old `prisma-client` generator for SQLite)
- SQLite via Turso/libSQL. Local: `file:./dev.db`, remote: Turso with `DATABASE_AUTH_TOKEN`
- Monetary values stored as **integers** (Rupiah in smallest unit)
- Composite primary keys on join tables (`BranchMenuState`, `MenuRecipe`, `BranchStock`)
- Optimistic concurrency via `version` field on `MenuItem` and `BranchStock`
- Idempotency on sales via `@unique([branchId, idempotencyKey])`
- Always use the singleton `prisma` from `src/lib/prisma.ts`

### Module Pattern

Each backend feature module follows:
```
src/modules/<feature>/
  <feature>.route.ts       # Hono router with endpoints
  <feature>.service.ts     # Business logic (when extracted)
  <feature>.schema.ts      # Zod validation schemas (when extracted)
```

Current modules: `auth`, `admin`, `health`. New modules should follow this structure.

### Development Status (per plan.md)

- ✅ **Phase 1** — Database foundation (schema, migrations, Prisma singleton)
- ✅ **Phase 2** — Initial seed data
- ✅ **Phase 3** — Project structure cleanup
- 🔄 **Phase 4** — Auth & RBAC (in progress: login endpoint exists, auth & role middleware exist)
- ⬜ **Phase 5** — Branch management
- ⬜ **Phase 6** — User management
- ⬜ **Phase 7** — Centralized catalog
- ⬜ **Phase 8** — Inventory & recipe
- ⬜ **Phase 9** — Sales transactions
- ⬜ **Phase 10+** — Real-time sync, analytics, testing, docs, production
