using Microsoft.EntityFrameworkCore;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;

namespace YearPlanningApp.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<IkigaiJourney> IkigaiJourneys => Set<IkigaiJourney>();
    public DbSet<IkigaiRoom> IkigaiRooms => Set<IkigaiRoom>();
    public DbSet<NorthStar> NorthStars => Set<NorthStar>();
    public DbSet<UserValue> UserValues => Set<UserValue>();
    public DbSet<MindMap> MindMaps => Set<MindMap>();
    public DbSet<MindMapNode> MindMapNodes => Set<MindMapNode>();
    public DbSet<Goal> Goals => Set<Goal>();
    public DbSet<SmartGoal> SmartGoals => Set<SmartGoal>();
    public DbSet<WoopReflection> WoopReflections => Set<WoopReflection>();
    public DbSet<Milestone> Milestones => Set<Milestone>();
    public DbSet<TaskItem> TaskItems => Set<TaskItem>();
    public DbSet<Habit> Habits => Set<Habit>();
    public DbSet<HabitLog> HabitLogs => Set<HabitLog>();
    public DbSet<FlowSession> FlowSessions => Set<FlowSession>();
    public DbSet<Review> Reviews => Set<Review>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── Soft delete query filters ──────────────────────────────────────
        modelBuilder.Entity<User>().HasQueryFilter(e => e.DeletedAt == null);
        modelBuilder.Entity<IkigaiJourney>().HasQueryFilter(e => e.DeletedAt == null);
        modelBuilder.Entity<IkigaiRoom>().HasQueryFilter(e => e.DeletedAt == null);
        modelBuilder.Entity<NorthStar>().HasQueryFilter(e => e.DeletedAt == null);
        modelBuilder.Entity<UserValue>().HasQueryFilter(e => e.DeletedAt == null);
        modelBuilder.Entity<MindMap>().HasQueryFilter(e => e.DeletedAt == null);
        modelBuilder.Entity<MindMapNode>().HasQueryFilter(e => e.DeletedAt == null);
        modelBuilder.Entity<Goal>().HasQueryFilter(e => e.DeletedAt == null);
        modelBuilder.Entity<SmartGoal>().HasQueryFilter(e => e.DeletedAt == null);
        modelBuilder.Entity<WoopReflection>().HasQueryFilter(e => e.DeletedAt == null);
        modelBuilder.Entity<Milestone>().HasQueryFilter(e => e.DeletedAt == null);
        modelBuilder.Entity<TaskItem>().HasQueryFilter(e => e.DeletedAt == null);
        modelBuilder.Entity<Habit>().HasQueryFilter(e => e.DeletedAt == null);
        modelBuilder.Entity<HabitLog>().HasQueryFilter(e => e.DeletedAt == null);
        modelBuilder.Entity<FlowSession>().HasQueryFilter(e => e.DeletedAt == null);
        modelBuilder.Entity<Review>().HasQueryFilter(e => e.DeletedAt == null);

        // ── Enums stored as integers (default in EF Core) ─────────────────
        // No extra config needed — int storage is the default

        // ── JSON columns (stored as text / jsonb via Npgsql) ──────────────
        modelBuilder.Entity<IkigaiRoom>()
            .Property(r => r.Answers)
            .HasColumnType("jsonb");

        modelBuilder.Entity<Goal>()
            .Property(g => g.AlignedValueNames)
            .HasColumnType("jsonb");

        modelBuilder.Entity<TaskItem>()
            .Property(t => t.AlignedValueNames)
            .HasColumnType("jsonb");

        modelBuilder.Entity<Review>()
            .Property(r => r.Answers)
            .HasColumnType("jsonb");

        // ── MindMapNode self-referencing ───────────────────────────────────
        modelBuilder.Entity<MindMapNode>()
            .HasOne(n => n.ParentNode)
            .WithMany(n => n.Children)
            .HasForeignKey(n => n.ParentNodeId)
            .OnDelete(DeleteBehavior.Restrict);

        // ── Indexes from Part 8 ────────────────────────────────────────────

        // Goals
        modelBuilder.Entity<Goal>()
            .HasIndex(g => new { g.UserId, g.Year })
            .HasFilter("deleted_at IS NULL")
            .HasDatabaseName("idx_goals_user_year");

        modelBuilder.Entity<Goal>()
            .HasIndex(g => new { g.UserId, g.Year, g.EnergyLevel })
            .HasFilter("deleted_at IS NULL")
            .HasDatabaseName("idx_goals_user_year_energy");

        // FlowSessions
        modelBuilder.Entity<FlowSession>()
            .HasIndex(s => new { s.UserId, s.StartedAt })
            .HasDatabaseName("idx_flow_sessions_user_started");

        modelBuilder.Entity<FlowSession>()
            .HasIndex(s => s.UserId)
            .HasFilter("ended_at IS NULL")
            .HasDatabaseName("idx_flow_sessions_active");

        // HabitLogs
        modelBuilder.Entity<HabitLog>()
            .HasIndex(l => new { l.HabitId, l.LoggedDate })
            .HasDatabaseName("idx_habit_logs_habit_date");

        // TaskItems — next action
        modelBuilder.Entity<TaskItem>()
            .HasIndex(t => t.GoalId)
            .HasFilter("is_next_action = true AND status != 3")
            .HasDatabaseName("idx_task_items_goal_next_action");

        // Reviews
        modelBuilder.Entity<Review>()
            .HasIndex(r => new { r.UserId, r.ReviewType, r.PeriodStart })
            .HasDatabaseName("idx_reviews_user_type_period");

        // Unique indexes (year-scoped entities)
        modelBuilder.Entity<MindMap>()
            .HasIndex(m => new { m.UserId, m.Year })
            .IsUnique()
            .HasFilter("deleted_at IS NULL")
            .HasDatabaseName("idx_mind_maps_user_year");

        modelBuilder.Entity<NorthStar>()
            .HasIndex(n => new { n.UserId, n.Year })
            .IsUnique()
            .HasDatabaseName("idx_north_star_user_year");

        modelBuilder.Entity<IkigaiJourney>()
            .HasIndex(j => new { j.UserId, j.Year })
            .IsUnique()
            .HasFilter("deleted_at IS NULL")
            .HasDatabaseName("idx_ikigai_journey_user_year");

        // ── snake_case naming convention ───────────────────────────────────
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            var tableName = entity.GetTableName();
            if (tableName != null)
                entity.SetTableName(ToSnakeCase(tableName));

            foreach (var property in entity.GetProperties())
            {
                var colName = property.GetColumnName();
                if (colName != null)
                    property.SetColumnName(ToSnakeCase(colName));
            }

            foreach (var key in entity.GetKeys())
            {
                var keyName = key.GetName();
                if (keyName != null)
                    key.SetName(ToSnakeCase(keyName));
            }

            foreach (var fk in entity.GetForeignKeys())
            {
                var constraintName = fk.GetConstraintName();
                if (constraintName != null)
                    fk.SetConstraintName(ToSnakeCase(constraintName));
            }
        }
    }

    private static string ToSnakeCase(string name)
    {
        if (string.IsNullOrEmpty(name)) return name;
        var result = System.Text.RegularExpressions.Regex.Replace(name, @"([a-z0-9])([A-Z])", "$1_$2");
        return result.ToLower();
    }
}
