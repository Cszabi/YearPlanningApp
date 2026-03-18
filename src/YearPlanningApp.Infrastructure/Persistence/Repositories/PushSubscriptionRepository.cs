using Microsoft.EntityFrameworkCore;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Infrastructure.Persistence.Repositories;

public class PushSubscriptionRepository : BaseRepository<PushSubscription>, IPushSubscriptionRepository
{
    public PushSubscriptionRepository(AppDbContext context) : base(context) { }

    public async Task<IEnumerable<PushSubscription>> GetByUserIdAsync(Guid userId, CancellationToken ct = default)
        => await _context.PushSubscriptions.Where(s => s.UserId == userId).ToListAsync(ct);

    public async Task<IEnumerable<PushSubscription>> GetActiveByUserIdAsync(Guid userId, CancellationToken ct = default)
        => await _context.PushSubscriptions.Where(s => s.UserId == userId && s.IsActive).ToListAsync(ct);

    public async Task UpsertAsync(PushSubscription subscription, CancellationToken ct = default)
    {
        var existing = await _context.PushSubscriptions
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.Endpoint == subscription.Endpoint, ct);

        if (existing is null)
        {
            await _context.PushSubscriptions.AddAsync(subscription, ct);
        }
        else
        {
            existing.P256dh = subscription.P256dh;
            existing.Auth = subscription.Auth;
            existing.UserAgent = subscription.UserAgent;
            existing.IsActive = true;
            existing.DeletedAt = null;
            existing.UpdatedAt = DateTime.UtcNow;
            _context.PushSubscriptions.Update(existing);
        }
    }

    public async Task DeactivateAsync(string endpoint, CancellationToken ct = default)
    {
        var subscription = await _context.PushSubscriptions
            .FirstOrDefaultAsync(s => s.Endpoint == endpoint, ct);
        if (subscription is null) return;
        subscription.IsActive = false;
        subscription.UpdatedAt = DateTime.UtcNow;
        _context.PushSubscriptions.Update(subscription);
    }
}
