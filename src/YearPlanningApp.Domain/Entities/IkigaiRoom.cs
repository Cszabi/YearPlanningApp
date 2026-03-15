using YearPlanningApp.Domain.Common;
using YearPlanningApp.Domain.Enums;

namespace YearPlanningApp.Domain.Entities;

public class IkigaiRoom : BaseEntity
{
    public Guid JourneyId { get; set; }
    public IkigaiJourney Journey { get; set; } = null!;
    public IkigaiRoomType RoomType { get; set; }
    public string Answers { get; set; } = "[]"; // JSON array of strings
    public bool IsComplete { get; set; }
}
