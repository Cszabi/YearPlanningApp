using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using YearPlanningApp.Domain.Interfaces;
using YearPlanningApp.Infrastructure.Persistence.Repositories;

namespace YearPlanningApp.Infrastructure.Persistence;

public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;
    private IDbContextTransaction? _transaction;

    public IUserRepository Users { get; }
    public IIkigaiRepository Ikigai { get; }
    public IMindMapRepository MindMaps { get; }
    public IGoalRepository Goals { get; }
    public ITaskRepository Tasks { get; }
    public IHabitRepository Habits { get; }
    public IFlowSessionRepository FlowSessions { get; }
    public IReviewRepository Reviews { get; }
    public IPushSubscriptionRepository PushSubscriptions { get; }
    public INotificationPreferenceRepository NotificationPreferences { get; }
    public IPageSessionRepository PageSessions { get; }
    public IUserActionRepository UserActions { get; }

    public UnitOfWork(AppDbContext context)
    {
        _context = context;
        Users = new UserRepository(context);
        Ikigai = new IkigaiRepository(context);
        MindMaps = new MindMapRepository(context);
        Goals = new GoalRepository(context);
        Tasks = new TaskRepository(context);
        Habits = new HabitRepository(context);
        FlowSessions = new FlowSessionRepository(context);
        Reviews = new ReviewRepository(context);
        PushSubscriptions = new PushSubscriptionRepository(context);
        NotificationPreferences = new NotificationPreferenceRepository(context);
        PageSessions = new PageSessionRepository(context);
        UserActions = new UserActionRepository(context);
    }

    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
        => await _context.SaveChangesAsync(ct);

    public async Task BeginTransactionAsync(CancellationToken ct = default)
        => _transaction = await _context.Database.BeginTransactionAsync(ct);

    public async Task CommitTransactionAsync(CancellationToken ct = default)
    {
        if (_transaction is not null)
            await _transaction.CommitAsync(ct);
    }

    public async Task RollbackTransactionAsync(CancellationToken ct = default)
    {
        if (_transaction is not null)
            await _transaction.RollbackAsync(ct);
    }

    public async Task PermanentlyDeleteUserAsync(Guid userId, CancellationToken ct = default)
    {
        // Null out self-referencing FKs first to avoid constraint violations
        await _context.Database.ExecuteSqlAsync(
            $"UPDATE task_items SET depends_on_task_id = NULL WHERE goal_id IN (SELECT id FROM goals WHERE user_id = {userId})", ct);

        await _context.Database.ExecuteSqlAsync(
            $"UPDATE mind_map_nodes SET parent_node_id = NULL WHERE mind_map_id IN (SELECT id FROM mind_maps WHERE user_id = {userId})", ct);

        // Delete leaf tables first, then their parents, then the user
        await _context.Database.ExecuteSqlAsync(
            $"DELETE FROM habit_logs WHERE habit_id IN (SELECT id FROM habits WHERE user_id = {userId})", ct);

        await _context.Database.ExecuteSqlAsync(
            $"DELETE FROM task_items WHERE goal_id IN (SELECT id FROM goals WHERE user_id = {userId})", ct);

        await _context.Database.ExecuteSqlAsync(
            $"DELETE FROM milestones WHERE goal_id IN (SELECT id FROM goals WHERE user_id = {userId})", ct);

        await _context.Database.ExecuteSqlAsync(
            $"DELETE FROM smart_goals WHERE goal_id IN (SELECT id FROM goals WHERE user_id = {userId})", ct);

        await _context.Database.ExecuteSqlAsync(
            $"DELETE FROM woop_reflections WHERE goal_id IN (SELECT id FROM goals WHERE user_id = {userId})", ct);

        await _context.Database.ExecuteSqlAsync(
            $"DELETE FROM habits WHERE user_id = {userId}", ct);

        await _context.Database.ExecuteSqlAsync(
            $"DELETE FROM flow_sessions WHERE user_id = {userId}", ct);

        await _context.Database.ExecuteSqlAsync(
            $"DELETE FROM goals WHERE user_id = {userId}", ct);

        await _context.Database.ExecuteSqlAsync(
            $"DELETE FROM mind_map_nodes WHERE mind_map_id IN (SELECT id FROM mind_maps WHERE user_id = {userId})", ct);

        await _context.Database.ExecuteSqlAsync(
            $"DELETE FROM mind_maps WHERE user_id = {userId}", ct);

        await _context.Database.ExecuteSqlAsync(
            $"DELETE FROM ikigai_rooms WHERE journey_id IN (SELECT id FROM ikigai_journeys WHERE user_id = {userId})", ct);

        await _context.Database.ExecuteSqlAsync(
            $"DELETE FROM north_stars WHERE user_id = {userId}", ct);

        await _context.Database.ExecuteSqlAsync(
            $"DELETE FROM user_values WHERE user_id = {userId}", ct);

        await _context.Database.ExecuteSqlAsync(
            $"DELETE FROM ikigai_journeys WHERE user_id = {userId}", ct);

        await _context.Database.ExecuteSqlAsync(
            $"DELETE FROM reviews WHERE user_id = {userId}", ct);

        await _context.Database.ExecuteSqlAsync(
            $"DELETE FROM users WHERE id = {userId}", ct);
    }

    public void Dispose()
    {
        _transaction?.Dispose();
        _context.Dispose();
    }
}
