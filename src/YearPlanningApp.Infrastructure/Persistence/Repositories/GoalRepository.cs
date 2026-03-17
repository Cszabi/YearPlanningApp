using Microsoft.EntityFrameworkCore;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Infrastructure.Persistence.Repositories;

public class GoalRepository : BaseRepository<Goal>, IGoalRepository
{
    public GoalRepository(AppDbContext context) : base(context) { }

    public async Task<IEnumerable<Goal>> GetByUserAndYearAsync(Guid userId, int year, CancellationToken ct = default)
        => await _context.Goals
            .Include(g => g.SmartGoal)
            .Include(g => g.WoopReflection)
            .Include(g => g.Milestones).ThenInclude(m => m.Tasks)
            .Where(g => g.UserId == userId && g.Year == year)
            .ToListAsync(ct);

    public async Task<IEnumerable<Goal>> GetByUserYearAndFilterAsync(Guid userId, int year, LifeArea? lifeArea, GoalStatus? status, CancellationToken ct = default)
    {
        var query = _context.Goals
            .Include(g => g.SmartGoal)
            .Include(g => g.WoopReflection)
            .Include(g => g.Milestones).ThenInclude(m => m.Tasks)
            .Where(g => g.UserId == userId && g.Year == year);

        if (lifeArea.HasValue) query = query.Where(g => g.LifeArea == lifeArea.Value);
        if (status.HasValue) query = query.Where(g => g.Status == status.Value);

        return await query.ToListAsync(ct);
    }

    public async Task<int> CountActiveDeepWorkGoalsAsync(Guid userId, int year, CancellationToken ct = default)
        => await _context.Goals.CountAsync(
            g => g.UserId == userId && g.Year == year
              && g.EnergyLevel == EnergyLevel.Deep
              && g.Status == GoalStatus.Active, ct);

    public async Task<Goal?> GetByIdWithMilestonesAsync(Guid id, CancellationToken ct = default)
        => await _context.Goals
            .Include(g => g.Milestones).ThenInclude(m => m.Tasks)
            .FirstOrDefaultAsync(g => g.Id == id, ct);

    public async Task AddMilestoneAsync(Milestone milestone, CancellationToken ct = default)
        => await _context.Milestones.AddAsync(milestone, ct);

    public async Task<Milestone?> GetMilestoneWithGoalAsync(Guid milestoneId, CancellationToken ct = default)
        => await _context.Milestones
            .Include(m => m.Goal)
            .Include(m => m.Tasks)
            .FirstOrDefaultAsync(m => m.Id == milestoneId, ct);

    public void UpdateMilestone(Milestone milestone)
    {
        milestone.UpdatedAt = DateTime.UtcNow;
        _context.Milestones.Update(milestone);
    }

    public void RemoveMilestone(Milestone milestone)
    {
        var now = DateTime.UtcNow;
        foreach (var task in milestone.Tasks)
        {
            task.DeletedAt = now;
            _context.TaskItems.Update(task);
        }
        milestone.DeletedAt = now;
        _context.Milestones.Update(milestone);
    }

    public async Task<double> CalculateGoalProgressAsync(Guid goalId, CancellationToken ct = default)
    {
        var total = await _context.TaskItems.CountAsync(t => t.GoalId == goalId, ct);
        if (total == 0) return 0;
        var completed = await _context.TaskItems.CountAsync(
            t => t.GoalId == goalId && t.Status == TaskItemStatus.Done, ct);
        return Math.Round((double)completed / total * 100);
    }
}
