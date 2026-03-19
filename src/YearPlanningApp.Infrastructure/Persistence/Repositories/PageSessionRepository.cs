using Microsoft.EntityFrameworkCore;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Infrastructure.Persistence.Repositories;

public class PageSessionRepository : BaseRepository<PageSession>, IPageSessionRepository
{
    public PageSessionRepository(AppDbContext context) : base(context) { }

    public async Task<IEnumerable<PageSession>> GetByPageAndDateRangeAsync(
        string page, DateTimeOffset from, DateTimeOffset to, CancellationToken ct = default)
        => await _context.PageSessions
            .Where(s => s.Page == page && s.SessionStart >= from && s.SessionStart <= to)
            .OrderByDescending(s => s.SessionStart)
            .ToListAsync(ct);

    public async Task<IEnumerable<PageSession>> GetByUserAndDateRangeAsync(
        Guid userId, DateTimeOffset from, DateTimeOffset to, CancellationToken ct = default)
        => await _context.PageSessions
            .Where(s => s.UserId == userId && s.SessionStart >= from && s.SessionStart <= to)
            .OrderBy(s => s.SessionStart)
            .ToListAsync(ct);
}
