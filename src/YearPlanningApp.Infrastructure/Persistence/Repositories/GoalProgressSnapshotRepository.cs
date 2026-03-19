using Microsoft.EntityFrameworkCore;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Infrastructure.Persistence.Repositories;

public class GoalProgressSnapshotRepository : BaseRepository<GoalProgressSnapshot>, IGoalProgressSnapshotRepository
{
    public GoalProgressSnapshotRepository(AppDbContext context) : base(context) { }

    public async Task<IEnumerable<GoalProgressSnapshot>> GetByGoalIdAsync(Guid goalId, Guid userId, CancellationToken ct = default)
        => await _context.GoalProgressSnapshots
            .Where(s => s.GoalId == goalId && s.UserId == userId)
            .OrderBy(s => s.SnapshotDate)
            .ToListAsync(ct);

    public async Task UpsertTodayAsync(Guid goalId, Guid userId, int progressPercent, CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var existing = await _context.GoalProgressSnapshots
            .FirstOrDefaultAsync(s => s.GoalId == goalId && s.SnapshotDate == today, ct);

        if (existing is not null)
        {
            existing.ProgressPercent = progressPercent;
            existing.UpdatedAt = DateTime.UtcNow;
            _context.GoalProgressSnapshots.Update(existing);
        }
        else
        {
            await _context.GoalProgressSnapshots.AddAsync(new GoalProgressSnapshot
            {
                GoalId = goalId,
                UserId = userId,
                ProgressPercent = progressPercent,
                SnapshotDate = today,
            }, ct);
        }
    }
}
