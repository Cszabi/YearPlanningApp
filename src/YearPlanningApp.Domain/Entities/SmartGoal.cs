using YearPlanningApp.Domain.Common;

namespace YearPlanningApp.Domain.Entities;

public class SmartGoal : BaseEntity
{
    public Guid GoalId { get; set; }
    public Goal Goal { get; set; } = null!;
    public string Specific { get; set; } = string.Empty;
    public string Measurable { get; set; } = string.Empty;
    public string Achievable { get; set; } = string.Empty;
    public string Relevant { get; set; } = string.Empty;
    public DateTime TimeBound { get; set; }
}
