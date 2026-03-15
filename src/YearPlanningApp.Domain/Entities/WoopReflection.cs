using YearPlanningApp.Domain.Common;

namespace YearPlanningApp.Domain.Entities;

public class WoopReflection : BaseEntity
{
    public Guid GoalId { get; set; }
    public Goal Goal { get; set; } = null!;
    public string Wish { get; set; } = string.Empty;
    public string Outcome { get; set; } = string.Empty;
    public string Obstacle { get; set; } = string.Empty;
    public string Plan { get; set; } = string.Empty;
}
