using YearPlanningApp.Domain.Common;
using YearPlanningApp.Domain.Enums;

namespace YearPlanningApp.Domain.Entities;

public class TaskItem : BaseEntity
{
    public Guid MilestoneId { get; set; }
    public Milestone Milestone { get; set; } = null!;
    public Guid GoalId { get; set; }
    public string Title { get; set; } = string.Empty;
    public TaskItemStatus Status { get; set; }
    public EnergyLevel EnergyLevel { get; set; }
    public int? EstimatedMinutes { get; set; }
    public DateTime? DueDate { get; set; }
    public bool IsNextAction { get; set; }
    public string AlignedValueNames { get; set; } = "[]"; // JSON array
    public Guid? DependsOnTaskId { get; set; }
}
