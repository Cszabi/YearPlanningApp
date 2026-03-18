using YearPlanningApp.Domain.Entities;

namespace YearPlanningApp.Domain.Interfaces;

public interface IPushSubscriptionRepository : IRepository<PushSubscription>
{
    Task<IEnumerable<PushSubscription>> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task<IEnumerable<PushSubscription>> GetActiveByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task UpsertAsync(PushSubscription subscription, CancellationToken ct = default);
    Task DeactivateAsync(string endpoint, CancellationToken ct = default);
}
