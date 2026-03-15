using Microsoft.EntityFrameworkCore;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Infrastructure.Persistence.Repositories;

public class FlowSessionRepository : BaseRepository<FlowSession>, IFlowSessionRepository
{
    public FlowSessionRepository(AppDbContext context) : base(context) { }

    public async Task<FlowSession?> GetActiveSessionAsync(Guid userId, CancellationToken ct = default)
        => await _context.FlowSessions
            .FirstOrDefaultAsync(s => s.UserId == userId && s.EndedAt == null, ct);

    public async Task<IEnumerable<FlowSession>> GetSessionsByDateRangeAsync(Guid userId, DateTime from, DateTime to, CancellationToken ct = default)
        => await _context.FlowSessions
            .Where(s => s.UserId == userId && s.StartedAt >= from && s.StartedAt <= to)
            .OrderByDescending(s => s.StartedAt)
            .ToListAsync(ct);
}
