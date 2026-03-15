using YearPlanningApp.Domain.Common;
using YearPlanningApp.Domain.Enums;

namespace YearPlanningApp.Domain.Entities;

public class Review : BaseEntity
{
    public Guid UserId { get; set; }
    public ReviewType ReviewType { get; set; }
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public string Answers { get; set; } = "{}"; // JSON — all section answers
    public bool IsComplete { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int? EnergyRating { get; set; }
}
