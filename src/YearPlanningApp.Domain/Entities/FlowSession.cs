using YearPlanningApp.Domain.Common;
using YearPlanningApp.Domain.Enums;

namespace YearPlanningApp.Domain.Entities;

public class FlowSession : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid? GoalId { get; set; }
    public Goal? Goal { get; set; }
    public Guid? TaskItemId { get; set; }
    public string? SessionIntention { get; set; }
    public int PlannedMinutes { get; set; }
    public int? ActualMinutes { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public int? FlowQualityRating { get; set; } // 1–5
    public int? EnergyAfterRating { get; set; } // 1–5
    public FlowSessionOutcome? Outcome { get; set; }
    public bool WasInterrupted { get; set; }
    public string? InterruptionReason { get; set; }
    public string? Blockers { get; set; }
    public AmbientSoundMode AmbientSound { get; set; }
    public EnergyLevel EnergyLevel { get; set; }
}
