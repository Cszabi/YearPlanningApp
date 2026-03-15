using YearPlanningApp.Domain.Entities;

namespace YearPlanningApp.Domain.Interfaces;

public interface ITaskRepository : IRepository<TaskItem>
{
    Task<IEnumerable<TaskItem>> GetTodaysTasksAsync(Guid userId, CancellationToken ct = default);
    Task<IEnumerable<TaskItem>> GetByGoalIdAsync(Guid goalId, CancellationToken ct = default);
    Task ClearNextActionForGoalAsync(Guid goalId, CancellationToken ct = default);
}
