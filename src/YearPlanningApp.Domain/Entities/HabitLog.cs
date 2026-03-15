using YearPlanningApp.Domain.Common;

namespace YearPlanningApp.Domain.Entities;

public class HabitLog : BaseEntity
{
    public Guid HabitId { get; set; }
    public Habit Habit { get; set; } = null!;
    public DateTime LoggedDate { get; set; }
    public string? Notes { get; set; }
    public int? DurationMinutes { get; set; }
}
