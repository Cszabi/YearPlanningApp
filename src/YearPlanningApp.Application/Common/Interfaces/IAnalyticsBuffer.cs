using YearPlanningApp.Domain.Entities;

namespace YearPlanningApp.Application.Common.Interfaces;

/// <summary>
/// Redis-backed buffer for high-frequency UserAction writes.
/// Falls back gracefully to direct DB writes when Redis is unavailable.
/// </summary>
public interface IAnalyticsBuffer
{
    bool IsAvailable { get; }
    Task BufferActionAsync(UserAction action, CancellationToken ct = default);
    Task<IReadOnlyList<UserAction>> DequeueAllAsync(CancellationToken ct = default);
}
