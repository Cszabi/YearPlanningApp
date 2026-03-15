# Flowkigai

> The only productivity app that starts with who you are, not what you need to do.

Flowkigai is a philosophy-driven annual planning application. It guides users through an Ikigai-based identity exploration, then flows into values clarification, mind mapping, goal setting, deep work sessions (flow timer), and structured weekly reviews.

## Tech Stack

- **Backend:** .NET 9, ASP.NET Core Web API, Clean Architecture
- **Database:** PostgreSQL 16 with EF Core 9
- **Cache / Idempotency:** Redis 7
- **Frontend:** React 18 + TypeScript + Vite, shadcn/ui, Tailwind CSS

## Getting Started

```bash
# Start infrastructure
docker compose up -d

# Run the API
dotnet run --project src/YearPlanningApp.API

# Run tests
dotnet test

# Frontend (once scaffolded in Prompt 0.6)
cd flowkigai-web && npm run dev
```

## Development

See `year-planning-app-coding-reference.md` for full architectural specifications and `year-planning-app-claude-code-prompts.md` for the session-by-session build guide.
