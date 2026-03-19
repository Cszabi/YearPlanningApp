namespace YearPlanningApp.Domain.Interfaces;

public interface IUnitOfWork : IDisposable
{
    IUserRepository Users { get; }
    IIkigaiRepository Ikigai { get; }
    IMindMapRepository MindMaps { get; }
    IGoalRepository Goals { get; }
    ITaskRepository Tasks { get; }
    IHabitRepository Habits { get; }
    IFlowSessionRepository FlowSessions { get; }
    IReviewRepository Reviews { get; }
    IPushSubscriptionRepository PushSubscriptions { get; }
    INotificationPreferenceRepository NotificationPreferences { get; }
    IPageSessionRepository PageSessions { get; }
    IUserActionRepository UserActions { get; }
    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task BeginTransactionAsync(CancellationToken ct = default);
    Task CommitTransactionAsync(CancellationToken ct = default);
    Task RollbackTransactionAsync(CancellationToken ct = default);

    /// <summary>
    /// Permanently (hard) deletes the user and ALL their data.
    /// Runs inside the current transaction if one is open.
    /// Caller is responsible for wrapping in Begin/Commit/Rollback.
    /// </summary>
    Task PermanentlyDeleteUserAsync(Guid userId, CancellationToken ct = default);
}
