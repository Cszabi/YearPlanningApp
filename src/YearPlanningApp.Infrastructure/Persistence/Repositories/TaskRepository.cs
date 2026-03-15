using Microsoft.EntityFrameworkCore;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Infrastructure.Persistence.Repositories;

public class TaskRepository : BaseRepository<TaskItem>, ITaskRepository
{
    public TaskRepository(AppDbContext context) : base(context) { }

    public async Task<IEnumerable<TaskItem>> GetTodaysTasksAsync(Guid userId, CancellationToken ct = default)
    {
        var today = DateTime.UtcNow.Date;
        return await _context.TaskItems
            .Include(t => t.Milestone).ThenInclude(m => m.Goal)
            .Where(t => t.Milestone.Goal.UserId == userId
                     && t.IsNextAction
                     && t.Status != TaskItemStatus.Done
                     && (t.DueDate == null || t.DueDate <= today))
            .ToListAsync(ct);
    }

    public async Task<IEnumerable<TaskItem>> GetByGoalIdAsync(Guid goalId, CancellationToken ct = default)
        => await _context.TaskItems.Where(t => t.GoalId == goalId).ToListAsync(ct);

    public async Task ClearNextActionForGoalAsync(Guid goalId, CancellationToken ct = default)
    {
        var tasks = await _context.TaskItems
            .Where(t => t.GoalId == goalId && t.IsNextAction)
            .ToListAsync(ct);
        foreach (var task in tasks)
        {
            task.IsNextAction = false;
            task.UpdatedAt = DateTime.UtcNow;
        }
    }
}
