using YearPlanningApp.Domain.Common;

namespace YearPlanningApp.Domain.Entities;

public class NotificationPreference : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public bool WeeklyReviewEnabled { get; set; } = true;
    public DayOfWeek WeeklyReviewDayOfWeek { get; set; } = DayOfWeek.Sunday;
    public int WeeklyReviewHour { get; set; } = 18;
    public bool GoalDeadlineEnabled { get; set; } = true;
    public string GoalDeadlineDaysBeforeList { get; set; } = "[1,3,7]"; // JSON array
    public bool HabitStreakRiskEnabled { get; set; } = true;
    public int HabitStreakRiskHour { get; set; } = 20;
    public string TimezoneId { get; set; } = "UTC";
}
