using YearPlanningApp.Domain.Enums;

namespace YearPlanningApp.Application.Analytics;

public record PageSessionDto(
    Guid Id,
    Guid UserId,
    string Page,
    DateTimeOffset SessionStart,
    DateTimeOffset? SessionEnd,
    int? DurationSeconds,
    PageExitType ExitType,
    string? DeviceType,
    IReadOnlyList<UserActionDto>? Actions);

public record UserActionDto(
    Guid Id,
    Guid UserId,
    Guid PageSessionId,
    string Page,
    string ActionType,
    string? ActionLabel,
    DateTimeOffset OccurredAt,
    string? Metadata);

public record ActionSummaryDto(
    string ActionType,
    int Count,
    double PercentOfSessions);

public record DurationBucketDto(
    string Label,
    int Count);

public record PageAnalyticsDto(
    string Page,
    double AverageDurationSeconds,
    double MedianDurationSeconds,
    int TotalSessions,
    int UniqueUsers,
    double DropOffRate,
    IReadOnlyList<ActionSummaryDto> TopActions,
    IReadOnlyList<DurationBucketDto> DurationBuckets);
