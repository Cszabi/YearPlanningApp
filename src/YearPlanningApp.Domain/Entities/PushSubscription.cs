using YearPlanningApp.Domain.Common;

namespace YearPlanningApp.Domain.Entities;

public class PushSubscription : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string Endpoint { get; set; } = string.Empty;
    public string P256dh { get; set; } = string.Empty;
    public string Auth { get; set; } = string.Empty;
    public string? UserAgent { get; set; }
    public bool IsActive { get; set; } = true;
}
