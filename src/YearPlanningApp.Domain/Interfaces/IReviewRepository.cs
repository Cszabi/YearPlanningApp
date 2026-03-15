using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;

namespace YearPlanningApp.Domain.Interfaces;

public interface IReviewRepository : IRepository<Review>
{
    Task<Review?> GetByTypeAndPeriodAsync(Guid userId, ReviewType reviewType, DateTime periodStart, CancellationToken ct = default);
    Task<IEnumerable<Review>> GetByUserAndYearAsync(Guid userId, ReviewType? reviewType, int? year, CancellationToken ct = default);
}
