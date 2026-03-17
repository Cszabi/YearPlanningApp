using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;

namespace YearPlanningApp.Domain.Interfaces;

public interface IGoalRepository : IRepository<Goal>
{
    Task<IEnumerable<Goal>> GetByUserAndYearAsync(Guid userId, int year, CancellationToken ct = default);
    Task<IEnumerable<Goal>> GetByUserYearAndFilterAsync(Guid userId, int year, LifeArea? lifeArea, GoalStatus? status, CancellationToken ct = default);
    Task<int> CountActiveDeepWorkGoalsAsync(Guid userId, int year, CancellationToken ct = default);
    Task<double> CalculateGoalProgressAsync(Guid goalId, CancellationToken ct = default);
    Task<Goal?> GetByIdWithMilestonesAsync(Guid id, CancellationToken ct = default);
    Task AddMilestoneAsync(Milestone milestone, CancellationToken ct = default);
    Task<Milestone?> GetMilestoneWithGoalAsync(Guid milestoneId, CancellationToken ct = default);
    void UpdateMilestone(Milestone milestone);
    void RemoveMilestone(Milestone milestone);
}
