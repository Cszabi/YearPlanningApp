using YearPlanningApp.Domain.Common;

namespace YearPlanningApp.Domain.Entities;

public class Milestone : BaseEntity
{
    public Guid GoalId { get; set; }
    public Goal Goal { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public DateTime? TargetDate { get; set; }
    public bool IsComplete { get; set; }
    public int OrderIndex { get; set; }
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
}
