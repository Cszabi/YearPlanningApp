using YearPlanningApp.Domain.Entities;

namespace YearPlanningApp.Domain.Interfaces;

public interface IGoalProgressSnapshotRepository : IRepository<GoalProgressSnapshot>
{
    Task<IEnumerable<GoalProgressSnapshot>> GetByGoalIdAsync(Guid goalId, Guid userId, CancellationToken ct = default);
    Task UpsertTodayAsync(Guid goalId, Guid userId, int progressPercent, CancellationToken ct = default);
}
