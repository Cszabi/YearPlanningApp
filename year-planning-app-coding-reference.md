# Flowkigai — Claude Code Reference Document

## Part 1 — Unique Proposition
The only productivity app that starts with who you are, not what you need to do.

Confirm you have read this document by stating this proposition before writing any code.

---

## Part 2 — Approved NuGet Packages (MIT Licensed Only)

> ⚠️ CRITICAL: Only use packages from this list. All must be MIT licensed.
> Do NOT add MediatR (v12.5+ is no longer MIT). Use Mediator (martinothamar) instead.

### Domain
| Package | Version | License |
|---|---|---|
| OneOf | 3.0.271 | MIT |

### Application
| Package | Version | License |
|---|---|---|
| Mediator.Abstractions | 3.0.0 | MIT |
| Mediator.SourceGenerator | 3.0.0 | MIT |
| FluentValidation | 12.1.1 | MIT |
| OneOf | 3.0.271 | MIT |

### Infrastructure
| Package | Version | License |
|---|---|---|
| Microsoft.EntityFrameworkCore | 8.0.0 | MIT |
| Npgsql.EntityFrameworkCore.PostgreSQL | 8.0.0 | MIT |
| Microsoft.EntityFrameworkCore.Design | 8.0.0 | MIT |
| StackExchange.Redis | 2.8.0 | MIT |
| Hangfire.Core | 1.8.14 | LGPL (approved) |
| Hangfire.AspNetCore | 1.8.14 | LGPL (approved) |
| Hangfire.PostgreSql | 1.20.9 | LGPL (approved) |
| Serilog | 4.0.0 | Apache 2.0 (approved) |
| Serilog.AspNetCore | 8.0.2 | Apache 2.0 (approved) |
| Serilog.Sinks.Console | 6.0.0 | Apache 2.0 (approved) |
| Serilog.Sinks.File | 6.0.0 | Apache 2.0 (approved) |

### API
| Package | Version | License |
|---|---|---|
| Microsoft.AspNetCore.Authentication.JwtBearer | 8.0.0 | MIT |
| Swashbuckle.AspNetCore | 6.9.0 | MIT |

### Tests
| Package | Version | License |
|---|---|---|
| xunit | 2.9.0 | Apache 2.0 (approved) |
| NSubstitute | 5.3.0 | BSD (approved) |
| Shouldly | 4.2.1 | MIT |
| Microsoft.EntityFrameworkCore.InMemory | 8.0.0 | MIT |

### EXPLICITLY EXCLUDED (do not use)
| Package | Reason | Replacement |
|---|---|---|
| MediatR v12.5+ | No longer MIT (commercial) | Mediator (martinothamar) |
| AutoMapper v13+ | No longer MIT | Manual mapping extensions |
| FluentAssertions v8+ | Moved commercial | Shouldly |
| Moq | SponsorLink telemetry concerns | NSubstitute |

---

## Part 3 — Solution Structure

```
YearPlanningApp/
├── src/
│   ├── YearPlanningApp.Domain/
│   │   ├── Entities/
│   │   │   ├── User.cs
│   │   │   ├── IkigaiJourney.cs
│   │   │   ├── IkigaiRoom.cs
│   │   │   ├── NorthStar.cs
│   │   │   ├── UserValue.cs
│   │   │   ├── MindMap.cs
│   │   │   ├── MindMapNode.cs
│   │   │   ├── Goal.cs
│   │   │   ├── SmartGoal.cs
│   │   │   ├── WoopReflection.cs
│   │   │   ├── Milestone.cs
│   │   │   ├── TaskItem.cs
│   │   │   ├── Habit.cs
│   │   │   ├── HabitLog.cs
│   │   │   ├── FlowSession.cs
│   │   │   └── Review.cs
│   │   ├── Enums/
│   │   ├── Interfaces/
│   │   │   ├── IRepository.cs
│   │   │   ├── IUnitOfWork.cs
│   │   │   ├── IGoalRepository.cs
│   │   │   ├── IHabitRepository.cs
│   │   │   ├── IFlowSessionRepository.cs
│   │   │   ├── IReviewRepository.cs
│   │   │   ├── IMindMapRepository.cs
│   │   │   ├── IIkigaiRepository.cs
│   │   │   └── ITaskRepository.cs
│   │   └── Common/
│   │       └── BaseEntity.cs
│   ├── YearPlanningApp.Application/
│   │   ├── Common/
│   │   │   ├── Behaviours/
│   │   │   │   ├── ValidationBehaviour.cs
│   │   │   │   ├── LoggingBehaviour.cs
│   │   │   │   └── AuthorisationBehaviour.cs
│   │   │   ├── Interfaces/
│   │   │   │   └── ICurrentUserService.cs
│   │   │   └── Models/
│   │   │       └── ResultTypes.cs
│   │   ├── Auth/
│   │   ├── Ikigai/
│   │   ├── MindMap/
│   │   ├── Goals/
│   │   ├── Habits/
│   │   ├── FlowSessions/
│   │   ├── Reviews/
│   │   └── DependencyInjection.cs
│   ├── YearPlanningApp.Infrastructure/
│   │   ├── Persistence/
│   │   │   ├── AppDbContext.cs
│   │   │   ├── Migrations/
│   │   │   ├── Repositories/
│   │   │   │   ├── BaseRepository.cs
│   │   │   │   └── [All concrete repos]
│   │   │   └── UnitOfWork.cs
│   │   ├── Services/
│   │   └── DependencyInjection.cs
│   └── YearPlanningApp.API/
│       ├── Controllers/
│       │   ├── AuthController.cs
│       │   ├── IkigaiController.cs
│       │   ├── MindMapController.cs
│       │   ├── GoalsController.cs
│       │   ├── TasksController.cs
│       │   ├── HabitsController.cs
│       │   ├── FlowSessionsController.cs
│       │   └── ReviewsController.cs
│       ├── Middleware/
│       │   └── ExceptionHandlingMiddleware.cs
│       └── Program.cs
├── tests/
│   ├── YearPlanningApp.Domain.Tests/
│   └── YearPlanningApp.Application.Tests/
└── docker-compose.yml
```

### Frontend Structure
```
flowkigai-web/
├── src/
│   ├── api/
│   │   └── client.ts           # Axios instance + JWT interceptor
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── ikigai/
│   │   ├── mindmap/
│   │   ├── goals/
│   │   ├── flow/
│   │   └── reviews/
│   ├── pages/
│   │   ├── IkigaiPage.tsx
│   │   ├── MindMapPage.tsx
│   │   ├── GoalsPage.tsx
│   │   ├── CalendarPage.tsx
│   │   ├── FlowPage.tsx
│   │   ├── TasksPage.tsx
│   │   ├── ReviewsPage.tsx
│   │   └── DashboardPage.tsx
│   ├── stores/
│   │   ├── authStore.ts
│   │   └── flowTimerStore.ts
│   └── App.tsx
```

---

## Part 4 — Domain Entities

### BaseEntity
```csharp
public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }
    public bool IsDeleted => DeletedAt.HasValue;
}
```

### User
```csharp
public class User : BaseEntity
{
    public string Email { get; set; }
    public string DisplayName { get; set; }
    public string PasswordHash { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiresAt { get; set; }
    public ICollection<IkigaiJourney> IkigaiJourneys { get; set; }
    public ICollection<Goal> Goals { get; set; }
    public ICollection<FlowSession> FlowSessions { get; set; }
}
```

### IkigaiJourney
```csharp
public class IkigaiJourney : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; }
    public int Year { get; set; }
    public IkigaiJourneyStatus Status { get; set; } // Draft, Complete
    public DateTime? CompletedAt { get; set; }
    public ICollection<IkigaiRoom> Rooms { get; set; }
    public NorthStar? NorthStar { get; set; }
    public ICollection<UserValue> Values { get; set; }
}

public enum IkigaiRoomType { Love = 1, GoodAt = 2, WorldNeeds = 3, PaidFor = 4, Synthesis = 5 }
public enum IkigaiJourneyStatus { Draft = 1, Complete = 2 }
```

### IkigaiRoom
```csharp
public class IkigaiRoom : BaseEntity
{
    public Guid JourneyId { get; set; }
    public IkigaiJourney Journey { get; set; }
    public IkigaiRoomType RoomType { get; set; }
    public string Answers { get; set; } // JSON array of strings
    public bool IsComplete { get; set; }
}
```

### NorthStar
```csharp
public class NorthStar : BaseEntity
{
    public Guid JourneyId { get; set; }
    public IkigaiJourney Journey { get; set; }
    public Guid UserId { get; set; }
    public int Year { get; set; }
    public string Statement { get; set; }
}
```

### UserValue
```csharp
public class UserValue : BaseEntity
{
    public Guid UserId { get; set; }
    public int Year { get; set; }
    public string ValueName { get; set; }
    public int Rank { get; set; } // 1–5, 1 = most important
}
```

### MindMap
```csharp
public class MindMap : BaseEntity
{
    public Guid UserId { get; set; }
    public int Year { get; set; }
    public ICollection<MindMapNode> Nodes { get; set; }
}

public enum MindMapNodeType { Root = 1, Branch = 2, Leaf = 3, Goal = 4 }
```

### MindMapNode
```csharp
public class MindMapNode : BaseEntity
{
    public Guid MindMapId { get; set; }
    public MindMap MindMap { get; set; }
    public Guid? ParentNodeId { get; set; }
    public MindMapNode? ParentNode { get; set; }
    public MindMapNodeType NodeType { get; set; }
    public string Label { get; set; }
    public string? Notes { get; set; }
    public double PositionX { get; set; }
    public double PositionY { get; set; }
    public Guid? LinkedGoalId { get; set; }
    public ICollection<MindMapNode> Children { get; set; }
}
```

### Goal
```csharp
public class Goal : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; }
    public int Year { get; set; }
    public string Title { get; set; }
    public GoalType GoalType { get; set; } // Project, Repetitive
    public GoalStatus Status { get; set; } // Active, Paused, Achieved, Dropped
    public LifeArea LifeArea { get; set; }
    public EnergyLevel EnergyLevel { get; set; } // Deep, Medium, Shallow
    public string? WhyItMatters { get; set; }
    public DateTime? TargetDate { get; set; }
    public string AlignedValueNames { get; set; } // JSON array
    public SmartGoal? SmartGoal { get; set; }
    public WoopReflection? WoopReflection { get; set; }
    public ICollection<Milestone> Milestones { get; set; }
    public ICollection<FlowSession> FlowSessions { get; set; }
}

public enum GoalType { Project = 1, Repetitive = 2 }
public enum GoalStatus { Active = 1, Paused = 2, Achieved = 3, Dropped = 4 }
public enum EnergyLevel { Deep = 1, Medium = 2, Shallow = 3 }
public enum LifeArea
{
    CareerWork = 1, HealthBody = 2, RelationshipsFamily = 3,
    LearningGrowth = 4, Finance = 5, CreativityHobbies = 6,
    EnvironmentLifestyle = 7, ContributionPurpose = 8
}
```

### SmartGoal
```csharp
public class SmartGoal : BaseEntity
{
    public Guid GoalId { get; set; }
    public Goal Goal { get; set; }
    public string Specific { get; set; }
    public string Measurable { get; set; }
    public string Achievable { get; set; }
    public string Relevant { get; set; }
    public DateTime TimeBound { get; set; }
}
```

### WoopReflection
```csharp
public class WoopReflection : BaseEntity
{
    public Guid GoalId { get; set; }
    public Goal Goal { get; set; }
    public string Wish { get; set; }
    public string Outcome { get; set; }
    public string Obstacle { get; set; }
    public string Plan { get; set; }
}
```

### Milestone
```csharp
public class Milestone : BaseEntity
{
    public Guid GoalId { get; set; }
    public Goal Goal { get; set; }
    public string Title { get; set; }
    public DateTime? TargetDate { get; set; }
    public bool IsComplete { get; set; }
    public int OrderIndex { get; set; }
    public ICollection<TaskItem> Tasks { get; set; }
}
```

### TaskItem
```csharp
public class TaskItem : BaseEntity
{
    public Guid MilestoneId { get; set; }
    public Milestone Milestone { get; set; }
    public Guid GoalId { get; set; }
    public string Title { get; set; }
    public TaskItemStatus Status { get; set; }
    public EnergyLevel EnergyLevel { get; set; }
    public int? EstimatedMinutes { get; set; }
    public DateTime? DueDate { get; set; }
    public bool IsNextAction { get; set; }
    public string AlignedValueNames { get; set; } // JSON array
    public Guid? DependsOnTaskId { get; set; }
}

public enum TaskItemStatus { NotStarted = 1, InProgress = 2, Done = 3, Deferred = 4 }
```

### Habit
```csharp
public class Habit : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid GoalId { get; set; }
    public Goal Goal { get; set; }
    public string Title { get; set; }
    public HabitFrequency Frequency { get; set; }
    public string MinimumViableDose { get; set; }
    public string? IdealDose { get; set; }
    public string? Trigger { get; set; }
    public string? CelebrationRitual { get; set; }
    public HabitTrackingMethod TrackingMethod { get; set; }
    public int CurrentStreak { get; set; }
    public int LongestStreak { get; set; }
    public ICollection<HabitLog> Logs { get; set; }
}

public enum HabitFrequency { Daily = 1, Weekly = 2, Monthly = 3, Custom = 4 }
public enum HabitTrackingMethod { Streak = 1, Count = 2, Duration = 3, YesNo = 4 }
```

### HabitLog
```csharp
public class HabitLog : BaseEntity
{
    public Guid HabitId { get; set; }
    public Habit Habit { get; set; }
    public DateTime LoggedDate { get; set; }
    public string? Notes { get; set; }
    public int? DurationMinutes { get; set; }
}
```

### FlowSession
```csharp
public class FlowSession : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid? GoalId { get; set; }
    public Goal? Goal { get; set; }
    public Guid? TaskItemId { get; set; }
    public string? SessionIntention { get; set; }
    public int PlannedMinutes { get; set; }
    public int? ActualMinutes { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public int? FlowQualityRating { get; set; } // 1–5
    public int? EnergyAfterRating { get; set; } // 1–5
    public FlowSessionOutcome? Outcome { get; set; }
    public bool WasInterrupted { get; set; }
    public string? InterruptionReason { get; set; }
    public string? Blockers { get; set; }
    public AmbientSoundMode AmbientSound { get; set; }
    public EnergyLevel EnergyLevel { get; set; }
}

public enum FlowSessionOutcome { Fully = 1, Partially = 2, NotReally = 3 }
public enum AmbientSoundMode { None = 1, BrownNoise = 2, WhiteNoise = 3, Nature = 4 }
```

### Review
```csharp
public class Review : BaseEntity
{
    public Guid UserId { get; set; }
    public ReviewType ReviewType { get; set; } // Weekly, Monthly, Quarterly, Annual
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public string Answers { get; set; } // JSON — all section answers
    public bool IsComplete { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int? EnergyRating { get; set; }
}

public enum ReviewType { Weekly = 1, Monthly = 2, Quarterly = 3, Annual = 4 }
```

---

## Part 5 — Repository Pattern

### IRepository<T>
```csharp
public interface IRepository<T> where T : BaseEntity
{
    Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IEnumerable<T>> GetAllAsync(CancellationToken ct = default);
    Task AddAsync(T entity, CancellationToken ct = default);
    void Update(T entity);
    void Remove(T entity);
}
```

### IUnitOfWork
```csharp
public interface IUnitOfWork : IDisposable
{
    IIkigaiRepository Ikigai { get; }
    IMindMapRepository MindMaps { get; }
    IGoalRepository Goals { get; }
    ITaskRepository Tasks { get; }
    IHabitRepository Habits { get; }
    IFlowSessionRepository FlowSessions { get; }
    IReviewRepository Reviews { get; }
    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task BeginTransactionAsync(CancellationToken ct = default);
    Task CommitTransactionAsync(CancellationToken ct = default);
    Task RollbackTransactionAsync(CancellationToken ct = default);
}
```

### Domain-Specific Repository Interfaces (examples)
```csharp
public interface IGoalRepository : IRepository<Goal>
{
    Task<IEnumerable<Goal>> GetByUserAndYearAsync(Guid userId, int year, CancellationToken ct = default);
    Task<int> CountActiveDeepWorkGoalsAsync(Guid userId, int year, CancellationToken ct = default);
    Task<double> CalculateGoalProgressAsync(Guid goalId, CancellationToken ct = default);
}

public interface IFlowSessionRepository : IRepository<FlowSession>
{
    Task<FlowSession?> GetActiveSessionAsync(Guid userId, CancellationToken ct = default);
    Task<IEnumerable<FlowSession>> GetSessionsByDateRangeAsync(Guid userId, DateTime from, DateTime to, CancellationToken ct = default);
    Task<FlowInsightsDto> GetFlowInsightsAsync(Guid userId, DateTime from, DateTime to, CancellationToken ct = default);
}
```

---

## Part 5b — OneOf Usage Pattern

### Standard Result Types
```csharp
public record ValidationError(IEnumerable<ValidationFailure> Errors);
public record NotFoundError(string EntityName, Guid Id);
public record ConflictError(string Message);
public record UnauthorizedError(string Message);
public record SuccessResult;
```

### Handler Return Type Convention
```csharp
// Command returning DTO or error
public record CreateGoalCommand(...) 
    : ICommand<OneOf<GoalDto, ValidationError, ConflictError>>;

// Handler
public async ValueTask<OneOf<GoalDto, ValidationError, ConflictError>> Handle(
    CreateGoalCommand command, CancellationToken ct)
{
    // validation, business logic, return
}
```

### Controller .Match() Pattern
```csharp
[HttpPost]
public async Task<IActionResult> CreateGoal(CreateGoalCommand command, CancellationToken ct)
{
    var result = await _mediator.Send(command, ct);
    return result.Match(
        goal => CreatedAtAction(nameof(GetGoal), new { id = goal.Id }, Envelope.Success(goal)),
        errors => BadRequest(Envelope.ValidationError(errors)),
        conflict => Conflict(Envelope.Error(conflict.Message))
    );
}
```

---

## Part 6 — REST Best Practices

1. **URL structure:** `/api/v{version}/{resource}/{id}/{sub-resource}` — always lowercase, hyphenated
2. **HTTP methods:** GET (read), POST (create), PUT (full update), PATCH (partial update), DELETE (soft delete)
3. **Status codes:** 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable Entity, 500 Internal Server Error
4. **Standard response envelope:**
```json
{
  "success": true,
  "data": {},
  "error": null,
  "timestamp": "2024-01-01T00:00:00Z"
}
```
5. **Pagination:** `GET /goals?page=1&pageSize=20&sortBy=createdAt&sortDir=desc`
6. **Filtering:** `GET /goals?year=2024&lifeArea=CareerWork&status=Active`
7. **API versioning:** URL path versioning `/api/v1/`
8. **Idempotency:** `Idempotency-Key` header on POST /flow-sessions (store in Redis 24h)
9. **Datetime:** All timestamps in ISO 8601 UTC (`2024-01-01T00:00:00Z`)
10. **Security headers:** HSTS, X-Content-Type-Options, X-Frame-Options on all responses
11. **Rate limiting:** Auth endpoints 10 req/min per IP; all others 100 req/min per user
12. **Soft deletes:** Never hard delete user data — set `deleted_at`, filter in EF query filters
13. **CORS:** Restrict to known origins in production
14. **Validation errors:** Return field-level detail array, never expose stack traces
15. **Global exception handler:** All unhandled exceptions → 500 with error code `INTERNAL_ERROR`

---

## Part 7 — API Endpoint Map

### Auth
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
```

### Ikigai
```
GET    /api/v1/ikigai/{year}
POST   /api/v1/ikigai/{year}/start
PUT    /api/v1/ikigai/{year}/rooms/{roomType}
POST   /api/v1/ikigai/{year}/complete
GET    /api/v1/ikigai/{year}/north-star
PUT    /api/v1/ikigai/{year}/north-star
GET    /api/v1/ikigai/{year}/values
PUT    /api/v1/ikigai/{year}/values
```

### Mind Map
```
GET    /api/v1/mind-maps/{year}
POST   /api/v1/mind-maps/{year}
POST   /api/v1/mind-maps/{year}/nodes
PUT    /api/v1/mind-maps/{year}/nodes/{nodeId}
DELETE /api/v1/mind-maps/{year}/nodes/{nodeId}
PATCH  /api/v1/mind-maps/{year}/nodes/positions
POST   /api/v1/mind-maps/{year}/nodes/{nodeId}/convert-to-goal
```

### Goals
```
GET    /api/v1/goals?year=&lifeArea=&status=
POST   /api/v1/goals
GET    /api/v1/goals/{id}
PUT    /api/v1/goals/{id}
PATCH  /api/v1/goals/{id}/status
PUT    /api/v1/goals/{id}/smart
PUT    /api/v1/goals/{id}/woop
POST   /api/v1/goals/{id}/milestones
PUT    /api/v1/goals/{id}/milestones/{milestoneId}
```

### Tasks
```
GET    /api/v1/tasks/today
POST   /api/v1/goals/{goalId}/milestones/{milestoneId}/tasks
PATCH  /api/v1/tasks/{id}/status
```

### Habits
```
GET    /api/v1/habits?year=
POST   /api/v1/habits
PUT    /api/v1/habits/{id}
POST   /api/v1/habits/{id}/log
```

### Flow Sessions
```
GET    /api/v1/flow-sessions/active
POST   /api/v1/flow-sessions          (Idempotency-Key required)
PATCH  /api/v1/flow-sessions/{id}/complete
PATCH  /api/v1/flow-sessions/{id}/interrupt
GET    /api/v1/flow-sessions?from=&to=
GET    /api/v1/flow-sessions/insights?from=&to=
```

### Reviews
```
GET    /api/v1/reviews/prompts/weekly
GET    /api/v1/reviews/prompts/monthly
GET    /api/v1/reviews/{type}/{periodStart}
POST   /api/v1/reviews
PUT    /api/v1/reviews/{id}
GET    /api/v1/reviews?type=&year=
GET    /api/v1/reviews/weekly-data        (auto-populated summary data)
```

---

## Part 8 — Database Configuration

### Naming Conventions
- Tables: snake_case plural (e.g. `ikigai_journeys`)
- Columns: snake_case (e.g. `created_at`, `user_id`)
- Primary keys: UUID, default `gen_random_uuid()`
- All timestamps: `TIMESTAMPTZ`
- Enums: stored as integers
- Soft delete: `deleted_at TIMESTAMPTZ NULL` + EF query filter

### JSON Columns
- `ikigai_rooms.answers` — `jsonb` (string array)
- `goals.aligned_value_names` — `jsonb` (string array)
- `task_items.aligned_value_names` — `jsonb` (string array)
- `reviews.answers` — `jsonb` (flexible section answers)

### Key Indexes
```sql
CREATE INDEX idx_goals_user_year ON goals(user_id, year) WHERE deleted_at IS NULL;
CREATE INDEX idx_goals_user_year_energy ON goals(user_id, year, energy_level) WHERE deleted_at IS NULL;
CREATE INDEX idx_flow_sessions_user_started ON flow_sessions(user_id, started_at);
CREATE INDEX idx_flow_sessions_active ON flow_sessions(user_id) WHERE ended_at IS NULL;
CREATE INDEX idx_habit_logs_habit_date ON habit_logs(habit_id, logged_date);
CREATE INDEX idx_task_items_goal_next_action ON task_items(goal_id) WHERE is_next_action = true AND status != 3;
CREATE INDEX idx_reviews_user_type_period ON reviews(user_id, review_type, period_start);
CREATE UNIQUE INDEX idx_mind_maps_user_year ON mind_maps(user_id, year) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_north_star_user_year ON north_stars(user_id, year);
CREATE UNIQUE INDEX idx_ikigai_journey_user_year ON ikigai_journeys(user_id, year) WHERE deleted_at IS NULL;
```

---

## Part 9 — Frontend Component Specs

### 9a — Values List (all 39)
Authenticity, Adventure, Balance, Belonging, Compassion, Courage, Creativity, Curiosity, Discipline, Empathy, Excellence, Fairness, Faith, Family, Freedom, Friendship, Generosity, Growth, Harmony, Health, Honesty, Humility, Impact, Independence, Integrity, Justice, Kindness, Leadership, Learning, Love, Loyalty, Meaning, Mindfulness, Openness, Purpose, Resilience, Responsibility, Security, Service, Simplicity, Spirituality, Stewardship, Trust, Wisdom

### 9b — Mind Map Interactions
- Double-click canvas → create node at position
- Double-click node → inline label edit (contentEditable, save on blur/Enter)
- Right-click → context menu (Add child / Edit notes / Convert to goal / Delete)
- Drag → reposition, debounced 500ms auto-save
- Node connection → drag from handle
- Convert to goal → modal: Project or Habit → navigate to Goal wizard pre-filled

### 9c — Goal Creation Wizard (8 steps)
1. Title (pre-filled if from mind map)
2. Life Area (8 cards)
3. Energy Level (3 cards + capacity warning at 3 deep goals)
4. SMART (5 sub-steps, one criterion per screen, serif font, large text area)
5. WOOP (4 sub-steps, W/O/O/P)
6. Why It Matters (open field)
7. Values Alignment (user's top 5 as selectable chips)
8. Summary (review + Edit buttons + Create)

Navigation: back/next, dot step indicator, jump to completed step, sessionStorage draft save.

### 9d — Flow Timer State Machine
```
Idle → Setup → Running → Paused → MicroReview → Complete
                   ↓
               Interrupted → Idle
```
- Running: full-screen distraction-free, SVG circular progress ring (elapsed), no countdown number
- Paused: frozen ring, resume overlay
- Interrupt: confirm modal → "Complete" → MicroReview, or "Record interruption" → reason field → Idle

### 9e — Weekly Review Sections
1. **Look Back:** Completed tasks (auto-populated), carried over + why, energy rating 1–5, habits (auto), flow summary (auto)
2. **Look Forward:** Top 3 priorities, flow sessions scheduled Y/N, next action per active goal
3. **Values Check:** Free text reflection + top 5 values shown as reference

Auto-save every 30 seconds. "Complete Review" button marks done.

---

## Part 10 — Design System

### Colours
```css
--color-primary: #0D6E6E;    /* teal */
--color-amber: #F5A623;
--color-coral: #E8705A;
--color-off-white: #FAFAF8;
--color-dark: #1A1A2E;
```

### Typography
- UI / functional: Inter
- Contemplative screens (Ikigai rooms, North Star): Georgia (serif)
- Ikigai prompt text: large, centred, wide line-height, no surrounding UI clutter

### Life Area Colours (for Mind Map branches)
```
CareerWork → #0D6E6E (teal)
HealthBody → #4CAF50 (green)
RelationshipsFamily → #E8705A (coral)
LearningGrowth → #9C27B0 (purple)
Finance → #F5A623 (amber)
CreativityHobbies → #FF5722 (orange)
EnvironmentLifestyle → #00BCD4 (cyan)
ContributionPurpose → #3F51B5 (indigo)
```

---

## Part 11 — Mediator Pipeline (martinothamar/Mediator)

```csharp
// In Application/DependencyInjection.cs
services.AddMediator(options =>
{
    options.ServiceLifetime = ServiceLifetime.Scoped;
});

// Pipeline order:
// LoggingBehaviour → ValidationBehaviour → AuthorisationBehaviour → Handler

public sealed class ValidationBehaviour<TRequest, TResponse>
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IMessage
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public async ValueTask<TResponse> Handle(
        TRequest request, 
        MessageHandlerDelegate<TRequest, TResponse> next,
        CancellationToken ct)
    {
        var context = new ValidationContext<TRequest>(request);
        var failures = _validators
            .Select(v => v.Validate(context))
            .SelectMany(r => r.Errors)
            .Where(f => f != null)
            .ToList();

        if (failures.Count != 0)
        {
            // Return ValidationError via OneOf — do not throw
        }

        return await next(request, ct);
    }
}
```

---

## Part 12 — Business Rules (enforce in Application layer)

1. Maximum 3 active EnergyLevel.Deep goals per user per year
2. A FlowSession cannot be started if another active session exists for the user
3. Habit streak: increments when logged on consecutive expected days; resets on missed expected day
4. Goal progress = (completed TaskItem count / total TaskItem count) * 100, rounded to int
5. NorthStar is unique per user per year (upsert, not multi-create)
6. IkigaiJourney is unique per user per year
7. MindMap is unique per user per year (auto-created on first visit)
8. IsNextAction can only be true on one TaskItem per Goal at a time
9. Weekly Review is unique per user per week (upsert — one per ISO week)
10. Soft delete only — never hard delete user data

---

## Part 13 — Authentication

### JWT Configuration
```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:SecretKey"]!))
        };
    });
```

### Token lifetimes
- Access token: 15 minutes
- Refresh token: 7 days
- Refresh token stored hashed in database

---

## Part 14 — Docker Compose

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: flowkigai
      POSTGRES_USER: flowkigai_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  api:
    build:
      context: .
      dockerfile: src/YearPlanningApp.API/Dockerfile
    ports:
      - "5000:8080"
    environment:
      - ConnectionStrings__DefaultConnection=Host=postgres;Database=flowkigai;Username=flowkigai_user;Password=${POSTGRES_PASSWORD}
      - ConnectionStrings__Redis=redis:6379
      - Jwt__Issuer=flowkigai
      - Jwt__Audience=flowkigai-web
      - Jwt__SecretKey=${JWT_SECRET_KEY}
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
  redis_data:
```

---

## Part 15 — Development Phases (POC)

### Phase 0 — Infrastructure (25h)
- [ ] Solution scaffold + project references
- [ ] Docker Compose + PostgreSQL + Redis
- [ ] AppDbContext + first migration
- [ ] Repository pattern + UnitOfWork
- [ ] Mediator pipeline + validation/logging behaviours
- [ ] JWT auth (register, login, refresh)
- [ ] Global exception handler + response envelope
- [ ] Serilog + Swagger + health checks
- [ ] React scaffold + Tailwind + shadcn/ui
- [ ] Zustand + TanStack Query + Axios JWT interceptor
- [ ] Auth pages (login/register)
- [ ] Tab navigation shell

### Phase 1 — Ikigai Journey (25h)
- [ ] IkigaiJourney, IkigaiRoom, NorthStar, UserValue entities + migration
- [ ] IkigaiRepository + commands/queries
- [ ] IkigaiController + all endpoints
- [ ] Ikigai room UI (rooms 1–4, one prompt at a time, fade-in)
- [ ] Room 5 synthesis + North Star reveal screen
- [ ] Values selector (select 10 → narrow to 5 → rank)
- [ ] Transition to Mind Map

### Phase 2 — Mind Map (26h)
- [ ] MindMap + MindMapNode entities + migration
- [ ] MindMapRepository + CRUD + convert-to-goal
- [ ] MindMapController
- [ ] React Flow canvas + custom node types
- [ ] All interactions (create/edit/delete/connect/convert)
- [ ] Auto-save positions (debounced)
- [ ] Ikigai pre-seeding

### Phase 3 — Goal Setting (34h)
- [ ] Goal, SmartGoal, WoopReflection, Milestone, TaskItem entities + migration
- [ ] Habit + HabitLog entities + migration
- [ ] All repositories + commands/queries
- [ ] GoalsController, TasksController, HabitsController
- [ ] Goal creation wizard (8 steps)
- [ ] Goal cards + habit cards
- [ ] Habit quick-log + celebration animation

### Phase 4 — Flow Timer (22h)
- [ ] FlowSession entity + migration
- [ ] FlowSessionRepository + insights aggregation
- [ ] FlowSessionsController + idempotency
- [ ] Zustand state machine (Idle→Setup→Running→Paused→MicroReview→Complete)
- [ ] Pre-session setup UI
- [ ] Distraction-free timer UI (SVG ring, no countdown)
- [ ] Post-session micro-review

### Phase 5 — Weekly Review (14h)
- [ ] Review entity + migration
- [ ] ReviewRepository + auto-populate query
- [ ] ReviewsController
- [ ] Weekly review form (3 sections, auto-populated)
- [ ] Review history list

### Phase 6 — Integration & Polish (24h)
- [ ] Dashboard (North Star + goal progress + habit streaks + flow insights)
- [ ] Cross-feature navigation wiring
- [ ] Error/loading/empty states audit
- [ ] Optimistic updates (habit log, task checkbox, node position)
- [ ] Auth edge cases (silent refresh, concurrent queue)
- [ ] Rate limiting
- [ ] Health check endpoint
- [ ] Seed data script (demo user)
- [ ] End-to-end POC journey test
