using YearPlanningApp.Domain.Entities;

namespace YearPlanningApp.Application.Analytics;

internal static class AnalyticsMappings
{
    internal static PageSessionDto ToDto(this PageSession s, IReadOnlyList<UserActionDto>? actions) => new(
        s.Id, s.UserId, s.Page, s.SessionStart, s.SessionEnd,
        s.DurationSeconds, s.ExitType, s.DeviceType, actions);

    internal static UserActionDto ToDto(this UserAction a) => new(
        a.Id, a.UserId, a.PageSessionId, a.Page,
        a.ActionType, a.ActionLabel, a.OccurredAt, a.Metadata);
}
