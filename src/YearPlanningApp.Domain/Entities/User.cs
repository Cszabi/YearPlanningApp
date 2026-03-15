using YearPlanningApp.Domain.Common;

namespace YearPlanningApp.Domain.Entities;

public class User : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiresAt { get; set; }
    public string? CalendarProvider { get; set; }  // "google" | "outlook" | null
    public ICollection<IkigaiJourney> IkigaiJourneys { get; set; } = new List<IkigaiJourney>();
    public ICollection<Goal> Goals { get; set; } = new List<Goal>();
    public ICollection<FlowSession> FlowSessions { get; set; } = new List<FlowSession>();
}
