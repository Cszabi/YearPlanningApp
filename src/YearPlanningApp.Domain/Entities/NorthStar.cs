using YearPlanningApp.Domain.Common;

namespace YearPlanningApp.Domain.Entities;

public class NorthStar : BaseEntity
{
    public Guid JourneyId { get; set; }
    public IkigaiJourney Journey { get; set; } = null!;
    public Guid UserId { get; set; }
    public int Year { get; set; }
    public string Statement { get; set; } = string.Empty;
}
