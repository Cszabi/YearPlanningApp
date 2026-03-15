using Microsoft.EntityFrameworkCore;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Infrastructure.Persistence.Repositories;

public class ReviewRepository : BaseRepository<Review>, IReviewRepository
{
    public ReviewRepository(AppDbContext context) : base(context) { }

    public async Task<Review?> GetByTypeAndPeriodAsync(Guid userId, ReviewType reviewType, DateTime periodStart, CancellationToken ct = default)
        => await _context.Reviews
            .FirstOrDefaultAsync(r => r.UserId == userId && r.ReviewType == reviewType && r.PeriodStart == periodStart, ct);

    public async Task<IEnumerable<Review>> GetByUserAndYearAsync(Guid userId, ReviewType? reviewType, int? year, CancellationToken ct = default)
    {
        var query = _context.Reviews.Where(r => r.UserId == userId);
        if (reviewType.HasValue) query = query.Where(r => r.ReviewType == reviewType.Value);
        if (year.HasValue) query = query.Where(r => r.PeriodStart.Year == year.Value);
        return await query.OrderByDescending(r => r.PeriodStart).ToListAsync(ct);
    }
}
