using YearPlanningApp.Domain.Common;
using YearPlanningApp.Domain.Enums;

namespace YearPlanningApp.Domain.Entities;

public class PageSession : BaseEntity
{
    public Guid UserId { get; set; }
    public string Page { get; set; } = string.Empty;
    public DateTimeOffset SessionStart { get; set; }
    public DateTimeOffset? SessionEnd { get; set; }
    public int? DurationSeconds { get; set; }
    public PageExitType ExitType { get; set; } = PageExitType.Unknown;
    public string? DeviceType { get; set; }

    public ICollection<UserAction>? Actions { get; set; }
}
