using YearPlanningApp.Domain.Common;
using YearPlanningApp.Domain.Enums;

namespace YearPlanningApp.Domain.Entities;

public class Goal : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public int Year { get; set; }
    public string Title { get; set; } = string.Empty;
    public GoalType GoalType { get; set; }
    public GoalStatus Status { get; set; }
    public LifeArea LifeArea { get; set; }
    public EnergyLevel EnergyLevel { get; set; }
    public string? WhyItMatters { get; set; }
    public DateTime? TargetDate { get; set; }
    public string AlignedValueNames { get; set; } = "[]"; // JSON array
    public SmartGoal? SmartGoal { get; set; }
    public WoopReflection? WoopReflection { get; set; }
    public int ProgressPercent { get; set; } = 0;
    public DateTime? CompletedAt { get; set; }
    public ICollection<Milestone> Milestones { get; set; } = new List<Milestone>();
    public ICollection<FlowSession> FlowSessions { get; set; } = new List<FlowSession>();
    public ICollection<GoalProgressSnapshot> ProgressSnapshots { get; set; } = new List<GoalProgressSnapshot>();
}
