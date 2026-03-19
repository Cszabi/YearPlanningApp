using Microsoft.EntityFrameworkCore;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Infrastructure.Persistence.Repositories;

public class UserActionRepository : BaseRepository<UserAction>, IUserActionRepository
{
    public UserActionRepository(AppDbContext context) : base(context) { }

    public async Task<IEnumerable<UserAction>> GetBySessionIdsAsync(
        IEnumerable<Guid> sessionIds, CancellationToken ct = default)
    {
        var ids = sessionIds.ToList();
        if (ids.Count == 0) return Enumerable.Empty<UserAction>();
        return await _context.UserActions
            .Where(a => ids.Contains(a.PageSessionId))
            .OrderBy(a => a.OccurredAt)
            .ToListAsync(ct);
    }

    public async Task<IEnumerable<UserAction>> GetByPageAndDateRangeAsync(
        string page, DateTimeOffset from, DateTimeOffset to, CancellationToken ct = default)
        => await _context.UserActions
            .Where(a => a.Page == page && a.OccurredAt >= from && a.OccurredAt <= to)
            .OrderBy(a => a.OccurredAt)
            .ToListAsync(ct);

    public async Task AddBatchAsync(IEnumerable<UserAction> actions, CancellationToken ct = default)
        => await _context.UserActions.AddRangeAsync(actions, ct);
}
