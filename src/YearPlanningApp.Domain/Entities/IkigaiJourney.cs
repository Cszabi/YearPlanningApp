using YearPlanningApp.Domain.Common;
using YearPlanningApp.Domain.Enums;

namespace YearPlanningApp.Domain.Entities;

public class IkigaiJourney : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public int Year { get; set; }
    public IkigaiJourneyStatus Status { get; set; }
    public DateTime? CompletedAt { get; set; }
    public ICollection<IkigaiRoom> Rooms { get; set; } = new List<IkigaiRoom>();
    public NorthStar? NorthStar { get; set; }
    public ICollection<UserValue> Values { get; set; } = new List<UserValue>();
}
