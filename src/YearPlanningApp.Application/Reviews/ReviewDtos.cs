using System.Text.Json;
using System.Text.Json.Serialization;
using YearPlanningApp.Domain.Entities;

namespace YearPlanningApp.Application.Reviews;

// ── Core DTO ──────────────────────────────────────────────────────────────────
public record ReviewDto(
    Guid Id,
    string ReviewType,
    string PeriodStart,
    string PeriodEnd,
    bool IsComplete,
    string? CompletedAt,
    int? EnergyRating,
    ReviewAnswersDto Answers,
    string CreatedAt,
    string UpdatedAt);

public record ReviewAnswersDto(
    string? CompletedTaskNotes,
    string? CarriedOverNote,
    string? HabitNotes,
    string? Priority1,
    string? Priority2,
    string? Priority3,
    string? FlowSessionsScheduled,
    Dictionary<string, string>? GoalNextActions,
    string? ValuesReflection);

// ── Weekly-data DTO ───────────────────────────────────────────────────────────
public record WeeklyReviewDataDto(
    string WeekStartDate,
    IReadOnlyList<CompletedTaskSummaryDto> CompletedTasks,
    IReadOnlyList<CompletedTaskSummaryDto> CarriedOverTasks,
    IReadOnlyList<HabitWeeklySummaryDto>   HabitSummaries,
    FlowWeeklySummaryDto                   FlowSummary,
    IReadOnlyList<GoalSummaryDto>          ActiveGoals);

public record CompletedTaskSummaryDto(string TaskId, string Title, string GoalTitle);
public record HabitWeeklySummaryDto(string HabitId, string Title, int DaysCompleted, int DaysExpected);
public record FlowWeeklySummaryDto(int SessionCount, int TotalMinutes, double? AvgFlowQuality, string? BestOutcome);
public record GoalSummaryDto(string Id, string Title, string GoalType, int ProgressPercent);

// ── Helpers ───────────────────────────────────────────────────────────────────
internal static class ReviewMappings
{
    private static readonly JsonSerializerOptions _opts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, PropertyNameCaseInsensitive = true };

    public static ReviewAnswersDto ParseAnswers(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<ReviewAnswersDto>(json, _opts) ?? new ReviewAnswersDto(null,null,null,null,null,null,null,null,null);
        }
        catch
        {
            return new ReviewAnswersDto(null,null,null,null,null,null,null,null,null);
        }
    }

    public static string SerializeAnswers(ReviewAnswersDto dto)
        => JsonSerializer.Serialize(dto, _opts);

    public static ReviewDto ToDto(this Review r) => new(
        r.Id,
        r.ReviewType.ToString(),
        r.PeriodStart.ToString("yyyy-MM-dd"),
        r.PeriodEnd.ToString("yyyy-MM-dd"),
        r.IsComplete,
        r.CompletedAt?.ToString("o"),
        r.EnergyRating,
        ParseAnswers(r.Answers),
        r.CreatedAt.ToString("o"),
        r.UpdatedAt.ToString("o"));
}
