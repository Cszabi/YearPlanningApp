# Flowkigai — Claude Code Session Prompts

## How to Use These Prompts

**Start every session with:**
```
Read /path/to/year-planning-app-coding-reference.md before writing any code.
Confirm you have read it by stating the unique proposition from Part 1.
```

**When a session runs long, close with:**
```
Summarise exactly what was completed, what files were created or modified,
and what the next prompt should start with.
```

**If Claude Code goes off-spec:**
```
Stop. Re-read Part [X] of the reference document.
Your implementation conflicts with the spec in these ways: [list].
Revert and follow the spec exactly.
```

**Commit after every completed prompt.** Never start a new session without committing the previous one.

---

## Session Map

| Session | Feature | Prompts | Est. Hours |
|---|---|---|---|
| 0 | Infrastructure | 0.1–0.6 | 25h |
| 1 | Ikigai Journey | 1.1–1.3 | 25h |
| 2 | Mind Map | 2.1–2.2 | 26h |
| 3 | Goal Setting | 3.1–3.3 | 34h |
| 4 | Flow Timer | 4.1–4.2 | 22h |
| 5 | Weekly Review | 5.1 | 14h |
| 6 | Integration & Polish | 6.1–6.2 | 24h |
| **Total** | | **17 prompts** | **~170h** |

---

## Session 0 — Project Setup & Infrastructure

### Prompt 0.1 — Repository + Solution Setup

```
You are building the Flowkigai Year Planning App.
Read the full coding reference document at [PATH TO YOUR MD FILE] before writing any code.

Your task: Scaffold the complete backend solution structure.

Create a .NET 8 solution called YearPlanningApp with these projects:
- YearPlanningApp.Domain (class library)
- YearPlanningApp.Application (class library)
- YearPlanningApp.Infrastructure (class library)
- YearPlanningApp.API (ASP.NET Core Web API)
- YearPlanningApp.Domain.Tests (xUnit)
- YearPlanningApp.Application.Tests (xUnit)

Add ONLY these NuGet packages (all MIT licensed — do not add anything else):
- Domain: OneOf 3.0.271
- Application: Mediator.Abstractions 3.0.0, Mediator.SourceGenerator 3.0.0,
  FluentValidation 12.1.1, OneOf 3.0.271
- Infrastructure: Microsoft.EntityFrameworkCore 8.0.0,
  Npgsql.EntityFrameworkCore.PostgreSQL 8.0.0,
  Microsoft.EntityFrameworkCore.Design 8.0.0,
  StackExchange.Redis 2.8.0, Hangfire.Core 1.8.14,
  Hangfire.AspNetCore 1.8.14, Hangfire.PostgreSql 1.20.9,
  Serilog 4.0.0, Serilog.AspNetCore 8.0.2,
  Serilog.Sinks.Console 6.0.0, Serilog.Sinks.File 6.0.0
- API: Microsoft.AspNetCore.Authentication.JwtBearer 8.0.0,
  Swashbuckle.AspNetCore 6.9.0
- Tests: xunit 2.9.0, NSubstitute 5.3.0, Shouldly 4.2.1,
  Microsoft.EntityFrameworkCore.InMemory 8.0.0

Create the exact folder structure from Part 3 of the coding reference.
Create empty placeholder files for all interfaces and classes shown in the structure.
Add a .gitignore and a README.md.

Done means: solution builds with zero errors, all projects referenced correctly.
```

---

### Prompt 0.2 — Docker + Database Setup

```
Continue building the Flowkigai Year Planning App.
Reference document: [PATH TO YOUR MD FILE]

Your task: Set up Docker Compose and the database foundation.

1. Create docker-compose.yml exactly as specified in Part 14 of the reference.
   Add a docker-compose.override.yml for local dev secrets.

2. Create AppDbContext.cs in Infrastructure/Persistence with:
   - All entity DbSets from Part 4 of the reference
   - OnModelCreating configured for:
     * All UUID primary keys using gen_random_uuid()
     * All TIMESTAMPTZ timestamps
     * Soft delete query filters (deleted_at IS NULL)
     * Enums stored as integers
     * JSON columns for: ikigai_rooms.answers, goals.aligned_value_names,
       task_items.aligned_value_names, reviews.answers
     * snake_case naming convention for all tables and columns

3. Create the first migration called InitialSchema.

4. Add all indexes from Part 8 of the reference.

Done means: docker-compose up starts cleanly,
dotnet ef database update runs successfully,
all tables created with correct columns and indexes.
```

---

### Prompt 0.3 — Repository Pattern + Unit of Work

```
Continue building the Flowkigai Year Planning App.
Reference document: [PATH TO YOUR MD FILE]

Your task: Implement the full Repository Pattern as specified in Part 5.

Create exactly:
1. IRepository<T> interface in Domain/Interfaces
2. IUnitOfWork interface in Domain/Interfaces with all repository properties
   as specified in Part 5
3. All individual repository interfaces in Domain/Interfaces
   (IGoalRepository, IHabitRepository, IFlowSessionRepository,
   IReviewRepository, IMindMapRepository, IIkigaiRepository, ITaskRepository)
   — each with the domain-specific methods shown in Part 5
4. BaseRepository<T> implementation in Infrastructure/Persistence/Repositories
5. All concrete repository implementations (one per interface) —
   implement the domain-specific query methods using EF Core
6. UnitOfWork implementation in Infrastructure/Persistence
7. Register everything in Infrastructure/DependencyInjection.cs

Write unit tests for BaseRepository using InMemory database.

Done means: all interfaces implemented, DI registration compiles,
tests pass for base repository CRUD operations.
```

---

### Prompt 0.4 — Auth System

```
Continue building the Flowkigai Year Planning App.
Reference document: [PATH TO YOUR MD FILE]

Your task: Implement complete JWT authentication.

1. Create User entity exactly as specified in Part 4 of the reference.
   Add ASP.NET Core Identity to the User entity.
   Add migration for identity tables.

2. Create these commands in Application/Auth:
   - RegisterCommand → returns OneOf<AuthResponse, ValidationError>
   - LoginCommand → returns OneOf<AuthResponse, NotFoundError, ValidationError>
   - RefreshTokenCommand → returns OneOf<AuthResponse, UnauthorizedError>

3. Add FluentValidation validators for RegisterCommand and LoginCommand.

4. Create AuthController with endpoints:
   POST /api/v1/auth/register
   POST /api/v1/auth/login
   POST /api/v1/auth/refresh
   POST /api/v1/auth/logout

   Use the OneOf .Match() controller pattern from Part 5b.
   Return correct HTTP status codes from Part 6.

5. Configure JWT in Program.cs with settings from Part 13.

6. Add the standard response envelope wrapper from Part 6.

7. Add ExceptionHandlingMiddleware that catches all unhandled exceptions
   and returns a clean 500 with error code INTERNAL_ERROR.

Done means: register → login → receive JWT → use JWT on protected endpoint
works end to end. Postman collection created for auth endpoints.
```

---

### Prompt 0.5 — Mediator Pipeline + Validation Behaviour

```
Continue building the Flowkigai Year Planning App.
Reference document: [PATH TO YOUR MD FILE]

Your task: Set up the Mediator pipeline with cross-cutting behaviours.

Using Mediator (martinothamar/Mediator — NOT MediatR), create:

1. ValidationBehaviour — runs FluentValidation before every command handler.
   If validation fails, return ValidationError without calling the handler.
   The ValidationError should contain all field-level errors as details array.

2. LoggingBehaviour — logs handler name, execution time, and result type
   using Serilog. Log at Information level for success, Warning for
   business errors (NotFoundError, ValidationError), Error for unexpected.

3. AuthorisationBehaviour — verifies the current user owns the requested
   resource. Extract UserId from JWT claims. Add ICurrentUserService
   interface and implementation.

4. Register all behaviours in Application/DependencyInjection.cs in
   correct order: Logging → Validation → Authorisation → Handler.

5. Configure Serilog in Program.cs to write to console (structured JSON)
   and to a rolling file in /logs.

Done means: sending a command with invalid data returns a 400 with
field-level validation errors. All handler executions are logged with timing.
```

---

### Prompt 0.6 — Frontend Scaffold

```
Continue building the Flowkigai Year Planning App.
Reference document: [PATH TO YOUR MD FILE]

Your task: Scaffold the complete React frontend.

1. Create a Vite + React 18 + TypeScript project.
   Install: tailwindcss, shadcn/ui, zustand, @tanstack/react-query,
   axios, react-router-dom, reactflow, @dnd-kit/sortable.

2. Create the exact folder structure from Part 3 (frontend section).

3. Set up:
   - Tailwind with the colour system from Part 10
     (primary teal #0D6E6E, amber #F5A623, coral #E8705A, off-white #FAFAF8)
   - Inter font for UI, Georgia for contemplative screens
   - Axios instance in api/client.ts with JWT interceptor
     (attach token, handle 401 refresh)
   - TanStack Query provider in App.tsx
   - React Router with all 8 tab routes from Part 10
   - Zustand authStore with user, token, login, logout actions

4. Create the tab navigation shell with all 8 tabs:
   🌸 Ikigai | 🗺️ Map | 🎯 Goals | 📅 Calendar |
   🌊 Flow | ✅ Tasks | 🔄 Reviews | 📊 Dashboard
   Each tab shows a placeholder page with the tab name.

5. Create Login and Register pages that connect to the auth API.

6. Add PWA manifest.json with app name "Flowkigai" and theme colours.

Done means: npm run dev starts, login works,
all 8 tabs navigate without errors, JWT persists on page refresh.
```

---

## Session 1 — Ikigai Journey

### Prompt 1.1 — Ikigai Backend

```
Continue building the Flowkigai Year Planning App.
Reference document: [PATH TO YOUR MD FILE]

Your task: Build the complete Ikigai backend.

1. Create all entities from Part 4:
   - IkigaiJourney (with IkigaiRoomType enum)
   - IkigaiRoom (answers stored as JSONB string array)
   - NorthStar
   - UserValue
   Add EF Core migrations for all.

2. Create IIkigaiRepository interface with:
   - GetJourneyByUserAndYearAsync
   - GetRoomByTypeAsync
   - GetNorthStarAsync
   - GetValuesByUserAndYearAsync

3. Implement IkigaiRepository.

4. Create Application commands and queries:
   Commands:
   - StartIkigaiJourneyCommand → OneOf<IkigaiJourneyDto, ConflictError>
   - SaveIkigaiRoomCommand → OneOf<IkigaiRoomDto, NotFoundError, ValidationError>
   - CompleteIkigaiJourneyCommand → OneOf<IkigaiJourneyDto, NotFoundError, ValidationError>
   - SaveNorthStarCommand → OneOf<NorthStarDto, ValidationError>
   - SaveUserValuesCommand → OneOf<List<UserValueDto>, ValidationError>

   Queries:
   - GetIkigaiJourneyQuery → OneOf<IkigaiJourneyDto, NotFoundError>
   - GetNorthStarQuery → OneOf<NorthStarDto, NotFoundError>
   - GetUserValuesQuery → IEnumerable<UserValueDto>

5. Create IkigaiController with all endpoints from Part 7.
   Use correct HTTP methods and status codes from Part 6.
   All responses use the standard envelope.

6. Write unit tests for SaveIkigaiRoomCommand handler
   covering: valid save, room not found, journey already complete.

Done means: full Ikigai API works end to end in Postman —
start journey, save all 5 rooms, complete, save north star, save values.
```

---

### Prompt 1.2 — Ikigai Frontend (Rooms 1–4)

```
Continue building the Flowkigai Year Planning App.
Reference document: [PATH TO YOUR MD FILE]

Your task: Build the Ikigai room UI for rooms 1–4.

DESIGN PRINCIPLE (critical): This must feel contemplative and unhurried.
NOT a form. NOT a wizard with progress bars. A journey.

Create IkigaiJourney.tsx as the container component with:
- Loads existing journey state on mount (resume if draft exists)
- Manages current room and current prompt index within room
- Smooth fade transitions between prompts (not slides)
- Progress shows room number only (1 of 5) — no percentage

Create IkigaiRoom.tsx for rooms 1–4 (Love, GoodAt, WorldNeeds, PaidFor):
- Prompts appear ONE AT A TIME — never show a list of questions
- Each prompt fades in alone, large, centred on screen
- Open text area below — no character limits, no validation pressure
- "Continue" button only appears after user types something (minimum 3 chars)
- After the last prompt in a room, soft transition to next room
- Save answers to API on each prompt completion (not just room completion)
- User can go back to previous prompt within a room
- Serif font (Georgia) for all prompt text
- Off-white background (#FAFAF8), no distracting UI elements during prompts

Use the exact prompt text from Part 0 of the product spec document:
- Room 1 (Love): 4 prompts as listed
- Room 2 (GoodAt): 4 prompts + optional social prompt
- Room 3 (WorldNeeds): 4 prompts
- Room 4 (PaidFor): 4 prompts

Store draft state in localStorage so user can leave and return.
Sync with API on each prompt save.

Done means: a user can go through all 4 rooms start to finish,
prompts feel calm and unhurried, state persists on page refresh.
```

---

### Prompt 1.3 — Ikigai Synthesis + Values

```
Continue building the Flowkigai Year Planning App.
Reference document: [PATH TO YOUR MD FILE]

Your task: Build Room 5 (Synthesis) and Values Clarification.

Room 5 — Synthesis screen:
- Show all answers from rooms 1–4 reflected back to the user
  in a clean, readable layout — their words, not the prompts
- Display by room with room name as subtle header
- Then show the 3 synthesis questions from the spec ONE AT A TIME
  (same fade-in pattern as other rooms)
- Final field: North Star statement — large text area, serif font
  Placeholder: "In one or two sentences — what feels like your direction?"
- On save: display the North Star statement LARGE and CENTRED
  on a dedicated screen before transitioning to values
  (this is a moment — give it space and silence)

Values Clarification screen (after North Star):
Create ValuesSelector.tsx:
- Phase 1: Grid of all 39 values from Part 9a of the coding reference
  Each value is a clickable card. Selected = highlighted teal.
  User selects UP TO 10. Show count "7 of 10 selected".
- Phase 2 (after selecting 10 or clicking "These feel right"):
  Show only selected values. User narrows to exactly 5.
  Unselected ones fade out.
- Phase 3: Drag-to-rank the final 5 values (1 = most important).
  Use @dnd-kit/sortable for drag and drop.
- Save button sends all 5 ranked values to API.

After values saved: transition to Mind Map tab with a
brief message: "Your map is ready. Let's see what emerged."

Done means: full Ikigai journey completes,
North Star is saved, values are ranked and saved,
transition to Mind Map happens naturally.
```

---

## Session 2 — Mind Map

### Prompt 2.1 — Mind Map Backend

```
Continue building the Flowkigai Year Planning App.
Reference document: [PATH TO YOUR MD FILE]

Your task: Build the complete Mind Map backend.

1. Create MindMap and MindMapNode entities from Part 4.
   MindMapNodeType enum: Root, Branch, Leaf, Goal.
   Add EF Core migration.

2. Create IMindMapRepository with:
   - GetByUserAndYearAsync (includes all nodes)
   - GetNodeByIdAsync
   - CreateMindMapAsync
   - AddNodeAsync, UpdateNodeAsync, RemoveNodeAsync
   - GetSeedSuggestionsFromIkigaiAsync (reads user's Ikigai answers
     and returns suggested node labels grouped by life area)

3. Implement MindMapRepository.

4. Create commands and queries:
   Commands:
   - CreateMindMapCommand → OneOf<MindMapDto, ConflictError>
     (auto-creates when user first visits mind map for year,
      pre-seeds root node with NorthStar statement,
      adds suggested branch nodes from Ikigai answers)
   - AddNodeCommand → OneOf<MindMapNodeDto, NotFoundError, ValidationError>
   - UpdateNodeCommand → OneOf<MindMapNodeDto, NotFoundError>
   - DeleteNodeCommand → OneOf<SuccessResult, NotFoundError>
   - ConvertNodeToGoalCommand → OneOf<GoalDto, NotFoundError, ValidationError>
     (creates Goal entity from node, sets LinkedGoalId on node,
      changes NodeType to Goal)
   - SaveNodePositionsCommand → OneOf<SuccessResult, NotFoundError>
     (batch update — receives array of {nodeId, x, y})

   Queries:
   - GetMindMapQuery → OneOf<MindMapDto, NotFoundError>

5. Create MindMapController with all endpoints from Part 7.

6. Write tests for ConvertNodeToGoalCommand —
   covers: successful conversion, node not found, node already a goal.

Done means: full CRUD on nodes works,
convert-to-goal creates a linked Goal entity,
batch position save works.
```

---

### Prompt 2.2 — Mind Map Frontend

```
Continue building the Flowkigai Year Planning App.
Reference document: [PATH TO YOUR MD FILE]

Your task: Build the Mind Map canvas UI using React Flow.

Create MindMapCanvas.tsx as the main component:

Setup:
- Load mind map from API on mount
- If no mind map exists for current year, trigger CreateMindMapCommand
- Display all nodes and edges from the API response
- Auto-layout initial nodes if positions are all zero

Node types — create custom React Flow node components:
- RootNode: Large, deep teal background, serif font,
  not draggable, always centred initially
- BranchNode: Medium, coloured by life area (8 colours from Part 10),
  shows life area label
- LeafNode: Small, neutral grey, clean
- GoalNode (Project): Teal border, 🎯 icon, shows goal status badge
- GoalNode (Repetitive): Amber border, 🔁 icon

Interactions (all from Part 9b of coding reference):
- Double-click blank canvas → create new node at click position
  Show small popup: "What goes here?" text field + confirm
- Double-click node → inline edit label (contentEditable)
  Save on blur or Enter key
- Right-click node → context menu:
  * "Add child node"
  * "Edit notes" (opens side panel)
  * "Convert to goal" (only on Leaf nodes — opens goal type selector)
  * "Delete node" (with confirmation for nodes with children)
- Drag node → reposition (auto-save positions, debounced 500ms)
- Connect nodes by dragging handle → creates parent-child relationship

Auto-save:
- Debounce position saves 500ms after drag ends
- Call SaveNodePositionsCommand with changed positions only

"Convert to Goal" flow:
- Show modal: "Project goal (one time) or Habit (recurring)?"
- On selection: navigate to Goals tab with pre-filled goal creation form

Done means: user can build a complete mind map,
nodes persist across page refresh, convert to goal navigates correctly.
```

---

## Session 3 — Goal Setting

### Prompt 3.1 — Goal Backend

```
Continue building the Flowkigai Year Planning App.
Reference document: [PATH TO YOUR MD FILE]

Your task: Build the complete Goal backend.

1. Create all goal-related entities from Part 4:
   Goal, SmartGoal, WoopReflection, Milestone, TaskItem.
   Also Habit and HabitLog entities.
   All enums: GoalType, GoalStatus, EnergyLevel, LifeArea,
   HabitFrequency, HabitTrackingMethod, TaskItemStatus.
   Add EF Core migration.

2. Create IGoalRepository, ITaskRepository, IHabitRepository
   with all domain-specific methods from Part 5.

3. Create all commands:
   - CreateGoalCommand → OneOf<GoalDto, ValidationError, ConflictError>
     ConflictError when: EnergyLevel==Deep AND active deep goals >= 3
   - UpdateGoalCommand → OneOf<GoalDto, NotFoundError, ValidationError>
   - UpdateGoalStatusCommand → OneOf<GoalDto, NotFoundError>
   - SaveSmartGoalCommand → OneOf<GoalDto, NotFoundError, ValidationError>
   - SaveWoopReflectionCommand → OneOf<GoalDto, NotFoundError, ValidationError>
   - CreateMilestoneCommand → OneOf<MilestoneDto, NotFoundError>
   - CreateTaskCommand → OneOf<TaskDto, NotFoundError>
   - UpdateTaskStatusCommand → OneOf<TaskDto, NotFoundError>
   - CreateHabitCommand → OneOf<HabitDto, NotFoundError, ValidationError>
   - LogHabitCommand → OneOf<HabitDto, NotFoundError>
     (updates streak on each log)

4. Create all queries:
   - GetGoalsQuery (filter by year, lifeArea, status) → IEnumerable<GoalDto>
   - GetGoalByIdQuery → OneOf<GoalDto, NotFoundError>
   - GetTodaysTasksQuery → IEnumerable<TaskDto>
     (returns IsNextAction==true tasks due today or overdue)
   - GetHabitsQuery → IEnumerable<HabitDto>

5. Goal progress calculation:
   Add CalculateGoalProgressAsync to IGoalRepository.
   Progress = (completed tasks / total tasks) * 100.
   Call this in GetGoalByIdQuery and include in GoalDto.

6. Create GoalsController, TasksController, HabitsController
   with all endpoints from Part 7. OneOf .Match() pattern throughout.

7. Write tests for:
   - CreateGoalCommand: capacity check blocks 4th deep goal
   - LogHabitCommand: streak increments correctly
   - CalculateGoalProgress: correct percentage calculation

Done means: full goal CRUD, SMART+WOOP save,
task creation and status update, habit logging all work in Postman.
```

---

### Prompt 3.2 — Goal Frontend (Project Goal Wizard)

```
Continue building the Flowkigai Year Planning App.
Reference document: [PATH TO YOUR MD FILE]

Your task: Build the project goal creation wizard.

Create a multi-step wizard GoalCreationWizard.tsx following the
8-step flow from Part 9c of the coding reference:

Step 1: Title
- Large text input, pre-filled if coming from mind map node
- Subtitle: "Name your goal clearly"

Step 2: Life Area
- 8 life area cards in a grid, each with icon and label

Step 3: Energy Level
- 3 large cards: 🔵 Deep Work / 🟡 Medium / ⚪ Shallow
- Each card has a tooltip explaining what that means in practice
- If user selects Deep and already has 3 active deep goals:
  Show warning banner with capacity check message
  User can still proceed (warning, not block)

Step 4: SMART (5 sub-steps, one criterion per screen)
- S: "What exactly do you want to achieve?"
- M: "How will you measure success?"
- A: "Is this realistic given what you have now?"
- R: "Why does this matter to you?" (emotional anchor)
- T: Date picker for target date
Each criterion: large label, large text area, serif font for label

Step 5: WOOP (4 sub-steps)
- W: "State your goal in one energising sentence"
- O: "What is the best possible result?"
- O: "What inner obstacle is most likely to get in your way?"
- P: Auto-generated template "If [obstacle from previous], then I will..."
  User completes the plan sentence

Step 6: Why It Matters
- Single open text field
- Label: "Why does this goal matter to you personally?"

Step 7: Values Alignment
- Show user's saved top 5 values as selectable chips
- User selects which values this goal serves (can select multiple)

Step 8: Summary
- Show all inputs in review card
- Edit buttons on each section
- "Create Goal" button → POST to API → on success navigate to Goals tab

Navigation:
- Back/Next buttons
- Step indicator (dots, not numbers)
- User can jump back to any completed step
- Draft saved to sessionStorage on each step

Done means: complete wizard flow works,
SMART + WOOP data saves correctly,
capacity warning shows at right moment.
```

---

### Prompt 3.3 — Goal Frontend (List, Cards, Habits)

```
Continue building the Flowkigai Year Planning App.
Reference document: [PATH TO YOUR MD FILE]

Your task: Build the Goals page, goal cards, and habit cards.

Goals page (GoalsPage.tsx):
- Tabs: "Active Goals" / "Habits" / "Completed"
- Filter bar: Life Area, Energy Level dropdowns
- "New Goal" button → opens GoalCreationWizard

GoalCard.tsx (project goals):
- Shows: title, life area badge, energy level indicator
- Progress bar (% from completed tasks)
- Status badge (On Track / At Risk / Paused)
- Target date with days remaining
- Aligned values shown as small chips
- Expand to show milestones + tasks inline
- Task items: checkbox to mark done, IsNextAction shown with ⚡ icon
- Overflow menu: Edit, Pause, Drop goal

HabitCard.tsx (repetitive goals):
- Shows: title, frequency label, streak count with 🔥
- Streak history: last 7 days as small coloured dots
  (filled = done, empty = missed)
- Big "Log Today" button (primary action)
- On log: brief celebration animation (scale + colour pulse)
  then show celebration ritual text from habit config
- Minimum viable dose shown as subtitle

RepetitiveGoalForm.tsx (creation form for habits):
- Frequency selector: Daily / Weekly / Monthly / Custom
- Minimum viable dose field with hint "e.g. 20 minutes of reading"
- Trigger field with hint "e.g. After morning coffee"
- Celebration ritual field with examples:
  "pump fist", "say done aloud", "mark with pen"

Done means: goals list shows correctly,
task completion updates progress bar,
habit log records and streak updates,
celebration animation fires on habit log.
```

---

## Session 4 — Flow Timer

### Prompt 4.1 — Flow Timer Backend

```
Continue building the Flowkigai Year Planning App.
Reference document: [PATH TO YOUR MD FILE]

Your task: Build the Flow Timer backend.

1. Create FlowSession entity from Part 4.
   All enums: FlowSessionOutcome, AmbientSoundMode.
   EF Core migration.

2. Create IFlowSessionRepository with:
   - GetActiveSessionAsync (returns incomplete session if exists)
   - GetSessionsByDateRangeAsync
   - GetFlowInsightsAsync (aggregate query returning FlowInsightsDto)
     FlowInsightsDto contains:
     * BestDayOfWeek (day with highest avg flow quality)
     * BestHourOfDay (hour with highest avg flow quality)
     * AvgSessionLength (for sessions with quality >= 4)
     * TotalSessionsThisWeek
     * TotalDeepWorkMinutesThisWeek
     * InterruptionRate (% of sessions interrupted)

3. Create commands:
   - StartFlowSessionCommand → OneOf<FlowSessionDto, ConflictError, ValidationError>
     ConflictError when active session already exists
   - CompleteFlowSessionCommand → OneOf<FlowSessionDto, NotFoundError, ValidationError>
     Sets ActualMinutes, FlowQualityRating, EnergyAfterRating, Outcome
   - InterruptFlowSessionCommand → OneOf<FlowSessionDto, NotFoundError>
     Sets WasInterrupted=true, InterruptionReason, ends session

4. Create queries:
   - GetActiveFlowSessionQuery → OneOf<FlowSessionDto, NotFoundError>
   - GetFlowSessionsQuery (date range) → IEnumerable<FlowSessionDto>
   - GetFlowInsightsQuery → FlowInsightsDto

5. Create FlowSessionsController with endpoints from Part 7.
   Idempotency-Key header support on start endpoint
   (store in Redis with 24h TTL to prevent double-starts).

6. Write tests:
   - StartFlowSession: blocks if active session exists
   - CompleteFlowSession: calculates actual minutes correctly
   - GetFlowInsights: correct aggregation with sample data

Done means: start → complete flow works,
interrupt records correctly,
insights endpoint returns aggregated data.
```

---

### Prompt 4.2 — Flow Timer Frontend

```
Continue building the Flowkigai Year Planning App.
Reference document: [PATH TO YOUR MD FILE]

Your task: Build the complete Flow Timer UI.

Create a Zustand store flowTimerStore.ts with the state machine
from Part 9d of the coding reference:
States: Idle | Setup | Running | Paused | MicroReview | Complete
Actions: startSetup, confirmSetup, pause, resume, interrupt, complete, reset

FlowPage.tsx (container):
- On mount: check for active session via GetActiveFlowSessionQuery
  If active session exists: restore Running state
- Renders the correct component based on current state

PreSessionSetup.tsx (Setup state):
- Task selector: searchable dropdown of today's tasks
  Shows task title + goal name + energy level badge
- Session length: 3 preset buttons based on energy level
  (🔵 90min / 🟡 45min / ⚪ 25min) + custom input
- Session intention: text area
  Label: "What does a successful session look like?"
- Ambient sound: 4 options with icons
  (Brown Noise 🟤 / White Noise ⚪ / Silence 🔇 / Nature 🌿)
- "Begin Session" button → POST start to API → transition to Running

FlowTimer.tsx (Running/Paused state):
- FULL SCREEN distraction-free mode (hides nav, hides everything)
- Soft circular progress ring (SVG) — shows time elapsed, not countdown
- Current task name shown in small text below ring
- Session intention shown as faint watermark text
- NO countdown number — only the ring
- Two buttons only: "Pause" and "End Session"
- Pause: freezes ring, shows "Paused" overlay, resume button appears
- End Session: confirmation modal
  "Complete session" → MicroReview state
  "Record interruption" → text field for reason → API interrupt → Idle

MicroReview.tsx (MicroReview state):
- Slides up smoothly after session ends
- Header: "How was that session?"
- Three questions (all required):
  1. Outcome: three large buttons — Fully ✅ / Partially 🟡 / Not really ❌
  2. Flow quality: 5 stars labelled Scattered / Distracted / Focused /
     Deep / In the zone
  3. Energy now: 5-point slider labelled Drained → Energised
- Optional: blockers text field
- "Save & Close" → POST complete to API → Complete state

Complete.tsx (Complete state):
- Session stats (duration, quality, goal linked)
- "Start another session" → back to Setup
- "Back to tasks" → Idle

Done means: full timer flow works start to finish,
state persists on page refresh (active session restored),
micro-review saves to API correctly.
```

---

## Session 5 — Weekly Review

### Prompt 5.1 — Review Backend + Frontend

```
Continue building the Flowkigai Year Planning App.
Reference document: [PATH TO YOUR MD FILE]

Your task: Build the complete Weekly Review feature.

BACKEND:

1. Create Review entity from Part 4. Migration.

2. Create IReviewRepository with:
   - GetByTypeAndPeriodAsync (find existing review for this week/month/quarter)
   - GetWeeklySummaryDataAsync (returns auto-populated data for review):
     * CompletedTasksThisWeek (list)
     * CarriedOverTasksThisWeek (list)
     * HabitLogsThisWeek (per habit: days completed / days expected)
     * FlowSessionSummary (from FlowInsightsDto for this week)

3. Create commands and queries:
   - CreateOrUpdateReviewCommand → OneOf<ReviewDto, ValidationError>
     (upsert — one review per week per user)
   - GetWeeklyReviewDataQuery → WeeklyReviewDataDto
     (auto-populates all sections that can be calculated)
   - GetReviewQuery → OneOf<ReviewDto, NotFoundError>

4. Create ReviewsController with endpoints from Part 7.
   GET /api/v1/reviews/prompts/weekly returns the prompt
   template questions as a structured list.

FRONTEND:

Create WeeklyReview.tsx following the three-section structure
from Part 9e of the coding reference:

LOOK BACK section:
- "Completed this week" — auto-populated task list (user can add free text)
- "What carried over and why?" — free text
- "Energy this week" — 1–5 slider with emoji labels
- "Habits this week" — auto-populated habit checklist
  (each habit shows days completed/expected)
- "Flow sessions this week" — auto-generated card showing:
  sessions count, total deep work hours, avg flow quality, best session

LOOK FORWARD section:
- "Top 3 priorities next week" — 3 text inputs
- "Are next week's flow sessions scheduled?" — yes/no/plan
- "Next action for each active goal" —
  auto-populated list of goals, text input per goal

VALUES CHECK section:
- "Did this week reflect what matters to you?" — free text
- Shows user's top 5 values as reference

Auto-save every 30 seconds while on the page.
"Complete Review" button marks it done.

Reviews tab shows history of past reviews as cards.
Each card shows: week, completion status, energy rating.

Done means: weekly review pre-populates with real data,
all sections save correctly, review history shows past entries.
```

---

## Session 6 — Integration & POC Polish

### Prompt 6.1 — Dashboard + Navigation Wiring

```
Continue building the Flowkigai Year Planning App.
Reference document: [PATH TO YOUR MD FILE]

Your task: Build the Dashboard and wire all cross-feature navigation.

DASHBOARD (DashboardPage.tsx):

Create 4 widgets:

1. NorthStarWidget — shows the user's North Star statement
   in large serif text at the top of the dashboard.
   Subtle, permanent presence.

2. GoalProgressWidget — shows all active goals as horizontal
   progress bars. Colour coded by energy level. Click → goes to goal.

3. HabitStreakWidget — shows all habits with current streak.
   Top habit by streak shown prominently.

4. FlowInsightsWidget — shows this week's stats:
   sessions count, deep work hours, avg quality.
   "Your peak time: [best hour from insights]"

CROSS-FEATURE NAVIGATION:

1. Mind Map "Convert to Goal" → pre-fills GoalCreationWizard
   Pass: title (from node label), life area (from parent branch node)

2. GoalCard "Start Session" button → pre-fills FlowTimer Setup
   Pass: goalId, linked task (if any)

3. Today's Tasks page → shows IsNextAction tasks across all goals
   Each task has "Start Flow Session" button

4. Weekly Review auto-populate → pulls from tasks, habits, flow sessions

5. Ikigai complete → auto-navigate to Mind Map
   Mind Map complete → auto-navigate to Goals

FINAL INTEGRATION CHECKS:

Run through the complete POC user journey:
1. Register new user
2. Complete full Ikigai journey (all 5 rooms + North Star + values)
3. Open pre-seeded mind map, add 3 branches, convert one leaf to project goal
4. Complete SMART + WOOP for the goal
5. Add 3 tasks to the goal
6. Start a flow session linked to one task
7. Complete the session with micro-review
8. Open weekly review — verify it auto-populates with session data
9. Complete the review

Fix any integration bugs found in this journey.

Done means: complete user journey works without errors,
all data flows correctly between features,
dashboard shows real data from the journey above.
```

---

### Prompt 6.2 — POC Hardening

```
Continue building the Flowkigai Year Planning App.
Reference document: [PATH TO YOUR MD FILE]

Your task: Harden the POC to be stable enough to show to real users.

1. ERROR HANDLING AUDIT
   Check every API call in the frontend has:
   - Loading state (skeleton or spinner)
   - Error state (user-friendly message, not raw error)
   - Empty state (helpful prompt, not blank screen)
   Fix any missing error/loading/empty states.

2. FORM VALIDATION FRONTEND
   All forms must validate before submission:
   - Required fields highlighted on submit attempt
   - Character limits shown where relevant
   - Date validation (target dates must be future)
   Match the backend FluentValidation rules.

3. OPTIMISTIC UPDATES
   These actions should feel instant (optimistic update, rollback on error):
   - Habit quick-log
   - Task status checkbox
   - Node position save in mind map

4. BASIC RESPONSIVE LAYOUT
   App must be usable on a 1280px laptop screen minimum.
   Ensure nothing is broken or cut off at standard laptop resolution.

5. AUTH EDGE CASES
   - Token expiry: silent refresh working
   - Refresh token expiry: redirect to login gracefully
   - Concurrent requests during refresh: queue them

6. BASIC RATE LIMITING
   Add .NET 8 built-in rate limiting to:
   - Auth endpoints: 10 requests/minute per IP
   - All other endpoints: 100 requests/minute per user

7. HEALTH CHECK ENDPOINT
   GET /health returns:
   - API status
   - Database connectivity
   - Redis connectivity

8. SEED DATA SCRIPT
   Create a script that seeds one complete demo user:
   - Completed Ikigai journey with sample answers
   - 3 active goals (1 deep, 1 medium, 1 habit)
   - 5 flow sessions over the past week
   - Partial weekly review

Done means: a fresh person can be handed the app URL,
log in with demo credentials, and experience the full
core loop without hitting any errors or blank screens.
```

---

## Reference: POC Time Estimates

| Phase | Feature | Hours | Days (3–4h/day) |
|---|---|---|---|
| 0 | Setup & Infrastructure | 25h | 3–4 days |
| 1 | Ikigai Journey | 25h | 3–4 days |
| 2 | Mind Map | 26h | 3–4 days |
| 3 | Goal Setting | 34h | 4–5 days |
| 4 | Flow Timer | 22h | 3 days |
| 5 | Weekly Review | 14h | 2 days |
| 6 | Integration & Polish | 24h | 3 days |
| **Total** | | **~170h raw** | **~21–25 days** |

**With Claude Code assistance (~30–35% faster):** ~110–120h of human-involved work.

**Minimum Viable POC (validate the core loop first):**
Ikigai Journey → Mind Map → Create one Goal → Flow Timer only.
Skip Weekly Review for first demo — validate the Ikigai experience first.
