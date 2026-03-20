using YearPlanningApp.Domain.Common;
using YearPlanningApp.Domain.Enums;

namespace YearPlanningApp.Domain.Entities;

public class Habit : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid GoalId { get; set; }
    public Goal Goal { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public HabitFrequency Frequency { get; set; }
    public string MinimumViableDose { get; set; } = string.Empty;
    public string? IdealDose { get; set; }
    public string? Trigger { get; set; }
    public string? CelebrationRitual { get; set; }
    public HabitTrackingMethod TrackingMethod { get; set; }
    public int CurrentStreak { get; set; }
    public int LongestStreak { get; set; }
    public bool NotificationEnabled { get; set; } = false;
    public int? ReminderHour { get; set; }
    public int? ReminderMinute { get; set; }
    public ICollection<HabitLog> Logs { get; set; } = new List<HabitLog>();
}
