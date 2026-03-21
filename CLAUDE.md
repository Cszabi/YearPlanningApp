# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Specification Files

Before writing any code for a new feature, read the relevant parts of these files:

| File | Purpose |
|------|---------|
| `year-planning-app-spec.md` | Product vision, features, UX flows |
| `year-planning-app-coding-reference.md` | Full technical architecture (15 parts) — authoritative source |
| `year-planning-app-claude-code-prompts.md` | 17 ordered session prompts (0.1–6.2) — all complete |
| `flowkigai-new-feature-prompts.md` | Post-beta session prompts (7.x+) for new features |
| `year-planning-app-poc-estimation.md` | Time estimates, risk factors, MVP strategy |

**When going off-spec:** stop, re-read the relevant part of the coding reference, revert, and follow the spec exactly.

## Commands

```bash
# Infrastructure (PostgreSQL 16 + Redis 7)
docker compose up -d

# Backend (from repo root)
dotnet build
dotnet test
dotnet test --filter "FullyQualifiedName~CreateGoalCommandHandlerTests"  # single test class
dotnet run --project src/YearPlanningApp.API                             # API runs on http://localhost:5253
dotnet ef migrations add <Name> --project src/YearPlanningApp.Infrastructure --startup-project src/YearPlanningApp.API

# Frontend (from flowkigai-web/)
npm install
npm run dev    # proxies /api → http://localhost:5253
npm run build  # tsc -b && vite build
npm run lint
npm test                          # vitest run (all tests, once)
npm run test:watch                # vitest interactive watch mode
npx vitest run LoginPage          # single test file by name
npm run test:coverage             # coverage report
```

## Backend Architecture

**Four projects in Clean Architecture order (no skipping layers):**
- `YearPlanningApp.Domain` — entities, enums, `IRepository<T>` interfaces (no dependencies)
- `YearPlanningApp.Application` — CQRS handlers, validators, DTOs (depends only on Domain)
- `YearPlanningApp.Infrastructure` — EF Core + Postgres, Redis, JWT, SMTP email (implements Application interfaces)
- `YearPlanningApp.API` — controllers, JWT middleware, Swagger, `ExceptionHandlingMiddleware`

**Application layer conventions:**
- Each feature lives in a single file: `record Command`, `AbstractValidator<Command>`, and `ICommandHandler` all co-located (e.g. `Goals/CreateGoalCommand.cs`)
- All handlers return `OneOf<T, Error>` — no exceptions for business errors
- Commands that require auth implement `IAuthenticatedCommand` (picked up by `AuthorisationBehaviour`)
- Pipeline order: `ValidationBehaviour → AuthorisationBehaviour → LoggingBehaviour`
- Use `IUnitOfWork` (from `Domain.Interfaces`) for all DB access; never inject `AppDbContext` into Application

**Infrastructure conventions:**
- Soft deletes only via `deleted_at` + EF global query filters
- UUID primary keys (`gen_random_uuid()`), all timestamps `TIMESTAMPTZ`, snake_case column names
- `ICurrentUserService` extracts `UserId` (Guid) from `HttpContext` claims
- `UnitOfWork` wraps all repositories; call `SaveChangesAsync` once per handler
- Email: `IEmailService` abstraction (Application layer) implemented by `SmtpEmailService`; config via `Infrastructure/Settings/SmtpSettings.cs`
- AI: `IIkigaiThemeExtractionService` (Application layer) implemented by `IkigaiThemeExtractionService` in Infrastructure; config via `Infrastructure/Settings/AnthropicSettings.cs` (`Anthropic:ApiKey` in appsettings)

**AI integration (Anthropic Claude API):**
- `ExtractIkigaiThemesCommand` — calls `IIkigaiThemeExtractionService` to extract themes from a user's Ikigai journey; returns `OneOf<IkigaiExtractionResult, NotFoundError, ExtractionError>`
- `SeedMindMapFromIkigaiCommand` — seeds MindMap nodes from extraction result; supports `MergeMode.Merge` (additive) and `MergeMode.Replace` (soft-deletes all non-root nodes first)
- `ExtractionError` is the new error type for AI failures — handlers must map it alongside `NotFoundError`
- `IkigaiJourney.HasSeededMindMap` tracks whether AI seeding has run; set via `journey.SetHasSeededMindMap(true)`

**API conventions:**
- All routes prefixed `/api/v1/`
- Response envelope: `{ success, data, error, timestamp }`
- `POST /flow-sessions` requires `Idempotency-Key` header (24h Redis TTL)
- Admin endpoints (`/api/v1/admin/users`) protected by `[Authorize(Policy = "AdminOnly")]`
- Analytics: `POST /analytics/page-session/start`, `POST /analytics/page-session/end`, `POST /analytics/action` (authenticated); `GET /analytics/pages`, `GET /analytics/users/{userId}/journey` (admin-only)
- Goal progress: `PATCH /goals/{id}/progress` (updates percent, auto-sets status to Achieved at 100%), `GET /goals/{id}/progress/history` (returns `GoalProgressSnapshotDto[]`)

**Domain — User entity fields:**
- `Role: UserRole` — `User = 0`, `Admin = 1`; default `User`
- `Plan: UserPlan` — `Free = 0`, `Pro = 1`; default `Free`

**Background jobs** (in `Infrastructure/Jobs/`): `GoalDeadlineReminderJob`, `HabitStreakRiskJob`, `WeeklyReviewReminderJob` — scheduled via Hangfire; registered in `DependencyInjection.cs`.

**Test stack:** xUnit + NSubstitute + Shouldly. Tests live in `tests/YearPlanningApp.Application.Tests/` (subfolders mirror Application feature folders) and `tests/YearPlanningApp.Domain.Tests/`.

## Frontend Architecture

**Stack:** React 19 + TypeScript + Vite, MUI v7 (primary component library), Tailwind CSS + shadcn/ui primitives, Zustand v5, TanStack Query v5, React Router v7, ReactFlow, @dnd-kit/sortable, Axios, Recharts (progress history charts).

`@` alias resolves to `flowkigai-web/src/`.

**Frontend test stack:** Vitest + Testing Library + MSW v2 (service worker mocks) + jsdom. Test files co-located with pages as `*.test.tsx`.

**Key files and folders:**
- `src/api/client.ts` — Axios instance with JWT Bearer interceptor and concurrent-safe token refresh queue; on 401 it queues requests, refreshes once, then retries all
- `src/stores/authStore.ts` — Zustand persisted store (`flowkigai-auth`); holds `user`, `accessToken`, `refreshToken`; `user.role` is `"User"` or `"Admin"`
- `src/stores/flowTimerStore.ts` — state machine: `idle → setup → running → paused → microreview → complete`
- `src/api/` — one file per domain (`goalApi.ts`, `habitApi.ts`, `adminApi.ts`, …); each exports typed DTOs + api object
- `src/components/layout/TabNav.tsx` — left sidebar nav (wraps all authenticated routes via `<Outlet>`); shows Admin nav item only when `user.role === "Admin"`
- `src/components/layout/AdminGuard.tsx` — redirects to `/` if `user.role !== "Admin"`; wraps `/admin` route
- `src/pages/AdminPage.tsx` — user management: list users, view detail, upgrade plan Free→Pro, soft-delete
- `src/pages/DocsPage.tsx` — renders `src/docs/philosophy.md` via `react-markdown` + `remark-gfm`
- `src/pages/GoalDetailPage.tsx` — per-goal detail view with milestones, tasks, SMART goal, WOOP
- `src/pages/NotificationSettingsPage.tsx` — push notification opt-in/out
- `src/pages/ForgotPasswordPage.tsx` / `ResetPasswordPage.tsx` — password reset flow
- `src/components/pdf/` — `@react-pdf/renderer` document components (`GoalsSummaryPdf`, `IkigaiCanvasPdf`, `WeeklyReviewPdf`, `FlowHistoryPdf`) + `PdfActionButtons` (download/email); PDF is generated client-side, then `POST /api/v1/export/email-pdf` sends it via `EmailPdfCommand`
- `src/hooks/usePageAnalytics.ts` — page session tracking hook; call at the top of every page component; wraps `analyticsApi.startSession` on mount and `analyticsApi.endSession` on unmount
- `src/components/goals/GoalProgressBar.tsx` — editable progress bar (slider + number input); calls `PATCH /goals/{id}/progress`; auto-marks goal as Achieved when set to 100%
- `src/pages/` — top-level page components; `src/components/{feature}/` for reusable sub-components
- `src/theme/` — MUI theme; use theme tokens everywhere, never hardcode hex colors

**Patterns:**
- Every `useQuery` page needs: loading (`CircularProgress`), error (`Alert` + retry), empty state
- API responses unwrapped via `data.data` (envelope `{ data: T }`)
- Optimistic updates: local `Record<id, override>` state + rollback in `catch` + `queryClient.invalidateQueries` on success
- MUI pages use `bgcolor: "background.default"` / `"background.paper"` — never hardcode colors

## Critical Business Rules

1. **Max 3 active "Deep Work" energy goals** per user per year — enforced in `CreateGoalCommandHandler`
2. **Only 1 active FlowSession** per user at a time
3. **Only 1 `IsNextAction = true`** per Goal at a time
4. **Year-scoped uniqueness:** IkigaiJourney, NorthStar, MindMap — 1 per user per year (upsert, not multi-create)
5. **Weekly Review:** 1 per user per ISO week (upsert)
6. **Idempotency:** `POST /flow-sessions` requires `Idempotency-Key` header (24h Redis TTL)
7. **Admin access:** `AdminOnly` policy checks `UserRole.Admin`; admin can list/delete users and upgrade plans

## Package Constraints

**Only MIT-licensed packages.** Do NOT add:
- MediatR v12.5+ (no longer MIT) — use `Mediator` (martinothamar) instead
- AutoMapper v13+
- Moq (telemetry concerns) — use NSubstitute instead

## Design System

Core colours: Teal `#0D6E6E`, Amber `#F5A623`, Coral `#E8705A`, Off-white `#FAFAF8`, Dark `#1A1A2E`

Typography: **functional UI uses Inter; contemplative screens (Ikigai rooms, North Star reveal, values reflection) use Georgia serif.** This distinction is intentional.

## Production Deployment

Full runbook in `DEPLOY.md`. Key points:
- `docker compose -f docker-compose.prod.yml up -d --build` — builds React frontend + .NET API, runs EF migrations on startup
- Do **not** run `dotnet build` locally before deploying — Docker builds clean on the VPS; local build fails if the API is already running (DLL locks)
- Secrets live in `.env` (never commit); JWT secret must be ≥ 32 chars or the API refuses to start
- Caddy handles TLS; Postgres and API are not exposed on host ports

## Development Discipline

- **All 17 original session prompts (0.1–6.2) are complete.** New features use `flowkigai-new-feature-prompts.md` (sessions 7.x+).
- **Commit after every session prompt** with format `feat: <short description>`. Never commit broken or partially working code.
- **Session handoff:** at end of a long session, summarise what was completed, which files were created/modified, and what the next prompt should start with.
