namespace YearPlanningApp.Application.Admin;

public record UserSummaryDto(
    Guid Id,
    string Email,
    string DisplayName,
    string Role,
    string Plan,
    DateTime CreatedAt,
    int GoalCount,
    int SessionCount);

public record UserDetailDto(
    Guid Id,
    string Email,
    string DisplayName,
    string Role,
    string Plan,
    DateTime CreatedAt,
    int GoalCount,
    int SessionCount,
    IReadOnlyList<string> GoalTitles,
    IReadOnlyList<DateTime> RecentSessionDates);
