using YearPlanningApp.Domain.Entities;

namespace YearPlanningApp.Domain.Interfaces;

public interface IUserActionRepository : IRepository<UserAction>
{
    Task<IEnumerable<UserAction>> GetBySessionIdsAsync(
        IEnumerable<Guid> sessionIds, CancellationToken ct = default);

    Task<IEnumerable<UserAction>> GetByPageAndDateRangeAsync(
        string page, DateTimeOffset from, DateTimeOffset to, CancellationToken ct = default);

    Task AddBatchAsync(IEnumerable<UserAction> actions, CancellationToken ct = default);
}
