# Flowkigai — POC Time Estimation

## What "POC" Means
A working web app where one real user can complete the full core loop:
**Ikigai Journey → Mind Map → Create one Goal → Run one Flow Session → Complete a Weekly Review**

Not production. Not polished. Not all features. Just the spine of the system working end to end, enough to validate the concept and show to early users.

---

## Assumptions
- One developer using Claude Code assistance
- Part-time (~3–4 hours per day)
- Working knowledge of C# and React
- Claude Code handles boilerplate
- POC scope only — no mobile, no Azure deployment, no production hardening
- Docker Compose local development only

---

## Phase Estimates

### Phase 0 — Project Setup & Infrastructure
Everything before the first feature.

| Task | Estimate |
|---|---|
| Solution structure (Clean Architecture, 4 projects) | 2h |
| Docker Compose (PostgreSQL + Redis) | 1h |
| EF Core setup + AppDbContext + first migration | 2h |
| Repository pattern + UnitOfWork wiring | 3h |
| Mediator setup + pipeline behaviours skeleton | 2h |
| JWT auth (register, login, refresh) | 4h |
| Global exception handler + response envelope | 2h |
| Serilog + Swagger + health checks | 2h |
| React app scaffold + Tailwind + shadcn/ui | 2h |
| Zustand stores + TanStack Query setup + API client | 2h |
| Auth flow frontend (login/register pages) | 3h |
| **Phase 0 total** | **~25 hours / 3–4 days** |

---

### Phase 1 — Ikigai Journey
The soul of the app — must feel right.

| Task | Estimate |
|---|---|
| IkigaiJourney + IkigaiRoom entities + migration | 2h |
| Repository + commands/queries (5 rooms + complete) | 3h |
| API endpoints (start, save room, complete) | 2h |
| NorthStar entity + endpoints | 1h |
| Values entity + endpoints (select + rank) | 2h |
| Frontend — room-by-room prompt UI (one prompt at a time) | 6h |
| Frontend — values selector (pick 10 → narrow to 5 → rank) | 4h |
| Frontend — North Star synthesis screen | 3h |
| Persistence of draft state (user can leave and return) | 2h |
| **Phase 1 total** | **~25 hours / 3–4 days** |

> Note: The backend is straightforward. The frontend is where time goes — getting the contemplative, unhurried feel right takes iteration.

---

### Phase 2 — Mind Map
The most technically complex feature.

| Task | Estimate |
|---|---|
| MindMap + MindMapNode entities + migration | 2h |
| Repository + CRUD commands | 3h |
| API endpoints (node CRUD + convert-to-goal) | 3h |
| React Flow canvas setup + custom node components | 5h |
| Node creation (double-click), editing, deletion | 4h |
| Context menu (right-click: add child, convert to goal) | 3h |
| Auto-save (debounced position persistence) | 2h |
| Pre-seeding from Ikigai answers | 3h |
| North Star as root node display | 1h |
| **Phase 2 total** | **~26 hours / 3–4 days** |

> Note: React Flow has a learning curve if new to it. The "convert to goal" handoff is fiddly.

---

### Phase 3 — Goal Setting
Most domain-rich feature.

| Task | Estimate |
|---|---|
| Goal + SmartGoal + WoopReflection entities + migration | 3h |
| Habit entity + HabitLog entities + migration | 2h |
| Milestone + TaskItem entities + migration | 2h |
| Repositories + all commands/queries | 5h |
| API endpoints (goals, SMART, WOOP, status) | 3h |
| Frontend — project goal creation wizard (multi-step, 8 steps) | 6h |
| Frontend — SMART form (one criterion per screen) | 3h |
| Frontend — WOOP form | 2h |
| Frontend — repetitive goal creation flow | 4h |
| Frontend — goal list + goal card components | 3h |
| Capacity check (3 deep-work goals warning) | 1h |
| **Phase 3 total** | **~34 hours / 4–5 days** |

> Note: Largest feature because of domain complexity and multi-step form UX.

---

### Phase 4 — Flow Timer
The daily heartbeat.

| Task | Estimate |
|---|---|
| FlowSession entity + migration | 1h |
| Repository + start/complete/interrupt commands | 3h |
| API endpoints + idempotency key (Redis) | 2h |
| Zustand flow timer state machine (Idle→Setup→Running→Paused→MicroReview→Complete) | 4h |
| Pre-session setup UI (task select, length, intention, sound) | 3h |
| Distraction-free timer UI (circular progress, no countdown number) | 4h |
| Post-session micro-review form | 2h |
| Basic flow insights (aggregate queries) | 3h |
| **Phase 4 total** | **~22 hours / 3 days** |

> Note: The state machine is the trickiest part. The UI is simpler than goal setting.

---

### Phase 5 — Weekly Review
Closing the loop — POC minimum.

| Task | Estimate |
|---|---|
| Review entity + migration | 1h |
| Repository + create/update commands | 2h |
| Auto-generated flow summary query | 2h |
| API endpoints | 2h |
| Frontend — weekly review form with all prompts (3 sections) | 4h |
| Auto-populated sections (tasks completed, habits, flow data) | 3h |
| **Phase 5 total** | **~14 hours / 2 days** |

---

### Phase 6 — Integration & POC Polish
Making it coherent enough to show someone.

| Task | Estimate |
|---|---|
| Wire all navigation tabs + cross-feature navigation | 2h |
| Bug fixing between features | 8h |
| Dashboard (North Star, goal progress, habit streaks, flow insights) | 4h |
| Today's task view (IsNextAction tasks) | 3h |
| Habit quick-log on habit cards | 2h |
| Basic streak calculation | 2h |
| Auth edge cases (silent refresh, token expiry) | 3h |
| End-to-end flow test (full user journey) | 3h |
| Seed data script (demo user) | 2h |
| **Phase 6 total** | **~29 hours / 4 days** |

> Note: Integration always takes longer than expected. Budget generously here.

---

## Summary Table

| Phase | Feature | Hours | Days (part-time) |
|---|---|---|---|
| 0 | Setup & Infrastructure | 25h | 3–4 days |
| 1 | Ikigai Journey | 25h | 3–4 days |
| 2 | Mind Map | 26h | 3–4 days |
| 3 | Goal Setting | 34h | 4–5 days |
| 4 | Flow Timer | 22h | 3 days |
| 5 | Weekly Review | 14h | 2 days |
| 6 | Integration & Polish | 29h | 4 days |
| **Total** | | **~175 hours** | **~22–26 days** |

---

## Realistic Calendar Estimate

| Scenario | Calendar Time |
|---|---|
| 3h/day, 5 days/week | 11–14 weeks (~3 months) |
| 4h/day, 5 days/week | 8–10 weeks (~2 months) |
| Full-time developer (7h/day) | 4–5 weeks (~1 month) |
| Two developers full-time | 2–3 weeks |

---

## The Claude Code Multiplier

**Where Claude Code saves the most time:**
- All boilerplate (entities, repositories, CRUD handlers, controllers) — ~40–50% faster
- Test scaffolding
- Docker and config files
- Repetitive frontend forms

**Where Claude Code saves less time:**
- React Flow integration — complex, requires visual testing and iteration
- The flow timer state machine — logic needs careful human verification
- Getting the Ikigai UX feeling right — this is craft, not code generation
- Integration bugs — Claude Code finds them but you need to understand them

**Adjusted estimate with Claude Code:** Reduce raw hours by ~30–35%.
Call it ~115–125 hours of actual human-involved work.

At 3–4 hours/day: **7–10 weeks for a solo part-time developer.**

---

## Honest Risk Factors

### Things that will take longer than estimated
- **React Flow** — almost everyone underestimates this
- **Auth edge cases** — token refresh, session expiry, concurrent tabs
- **The Ikigai UX** — you'll rebuild it at least once when it doesn't feel right
- **EF Core migrations** — schema changes mid-development are painful
- **First integration pass** — features that work in isolation often break together

### Things that could go faster
- If you already have a Clean Architecture template you've used before
- If the Mediator pipeline clicks quickly
- If React Flow documentation covers your specific use cases well (it does)

---

## Recommended Minimum Viable POC

Don't try to build all phases before showing anyone. Cut the POC earlier:

**MVP POC (target ~6 weeks part-time):**
Ikigai Journey → Mind Map → Create one Goal → Flow Timer

Skip the Weekly Review for the first demo. If those four features feel right and someone goes through the Ikigai journey and says "this is different from anything I've used" — you have your validation. Then build Phase 5 and 6.

The Weekly Review and full review system can come in a second sprint after validating the core experience.

---

## Development Sequence (do not skip ahead)

Each phase builds on the previous. The sequence is:

```
Phase 0 (infrastructure) → Phase 1 (Ikigai) → Phase 2 (Mind Map)
→ Phase 3 (Goals) → Phase 4 (Flow Timer) → Phase 5 (Review)
→ Phase 6 (Integration)
```

Commit after every Claude Code session. Never start a new session without committing the previous one. Claude Code context resets between sessions — your git history is your safety net.
