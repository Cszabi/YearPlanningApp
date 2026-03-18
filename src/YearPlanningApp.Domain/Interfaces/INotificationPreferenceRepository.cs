using YearPlanningApp.Domain.Entities;

namespace YearPlanningApp.Domain.Interfaces;

public interface INotificationPreferenceRepository
{
    Task<NotificationPreference?> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task UpsertAsync(NotificationPreference preference, CancellationToken ct = default);
    Task<IEnumerable<NotificationPreference>> GetAllAsync(CancellationToken ct = default);
}
