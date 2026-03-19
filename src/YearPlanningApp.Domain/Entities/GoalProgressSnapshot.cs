using YearPlanningApp.Domain.Common;

namespace YearPlanningApp.Domain.Entities;

public class GoalProgressSnapshot : BaseEntity
{
    public Guid GoalId { get; set; }
    public Goal Goal { get; set; } = null!;
    public Guid UserId { get; set; }
    public int ProgressPercent { get; set; }
    public DateOnly SnapshotDate { get; set; }
}
