using YearPlanningApp.Domain.Entities;

namespace YearPlanningApp.Domain.Interfaces;

public interface IPageSessionRepository : IRepository<PageSession>
{
    Task<IEnumerable<PageSession>> GetByPageAndDateRangeAsync(
        string page, DateTimeOffset from, DateTimeOffset to, CancellationToken ct = default);

    Task<IEnumerable<PageSession>> GetByUserAndDateRangeAsync(
        Guid userId, DateTimeOffset from, DateTimeOffset to, CancellationToken ct = default);
}
