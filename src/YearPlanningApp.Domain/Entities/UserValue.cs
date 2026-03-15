using YearPlanningApp.Domain.Common;

namespace YearPlanningApp.Domain.Entities;

public class UserValue : BaseEntity
{
    public Guid UserId { get; set; }
    public int Year { get; set; }
    public string ValueName { get; set; } = string.Empty;
    public int Rank { get; set; } // 1–5, 1 = most important
}
