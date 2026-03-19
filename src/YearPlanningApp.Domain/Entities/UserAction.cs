using YearPlanningApp.Domain.Common;

namespace YearPlanningApp.Domain.Entities;

public class UserAction : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid PageSessionId { get; set; }
    public PageSession? PageSession { get; set; }
    public string Page { get; set; } = string.Empty;
    public string ActionType { get; set; } = string.Empty;
    public string? ActionLabel { get; set; }
    public DateTimeOffset OccurredAt { get; set; }
    public string? Metadata { get; set; }
}
