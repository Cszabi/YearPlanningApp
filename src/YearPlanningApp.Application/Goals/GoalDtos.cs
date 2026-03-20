using System.Text.Json;
using YearPlanningApp.Domain.Entities;

namespace YearPlanningApp.Application.Goals;

// ── Goal ──────────────────────────────────────────────────────────────────────
public record GoalDto(
    Guid Id,
    int Year,
    string Title,
    string GoalType,
    string Status,
    string LifeArea,
    string EnergyLevel,
    string? WhyItMatters,
    DateTime? TargetDate,
    string[] AlignedValueNames,
    int ProgressPercent,
    DateTime? CompletedAt,
    SmartGoalDto? SmartGoal,
    WoopReflectionDto? WoopReflection,
    IReadOnlyList<MilestoneDto> Milestones);

// ── SmartGoal ─────────────────────────────────────────────────────────────────
public record SmartGoalDto(
    Guid Id,
    string Specific,
    string Measurable,
    string Achievable,
    string Relevant,
    DateTime TimeBound);

// ── WoopReflection ────────────────────────────────────────────────────────────
public record WoopReflectionDto(
    Guid Id,
    string Wish,
    string Outcome,
    string Obstacle,
    string Plan);

// ── Milestone ─────────────────────────────────────────────────────────────────
public record MilestoneDto(
    Guid Id,
    string Title,
    DateTime? TargetDate,
    bool IsComplete,
    int OrderIndex,
    IReadOnlyList<TaskDto> Tasks);

// ── Task ──────────────────────────────────────────────────────────────────────
public record TaskDto(
    Guid Id,
    Guid GoalId,
    Guid MilestoneId,
    string Title,
    string Status,
    string EnergyLevel,
    int? EstimatedMinutes,
    DateTime? DueDate,
    bool IsNextAction);

// ── Habit ─────────────────────────────────────────────────────────────────────
public record HabitLogDto(
    Guid Id,
    DateTime LoggedDate,
    string? Notes,
    int? DurationMinutes);

public record HabitDto(
    Guid Id,
    Guid GoalId,
    string Title,
    string Frequency,
    string TrackingMethod,
    string MinimumViableDose,
    string? IdealDose,
    string? Trigger,
    string? CelebrationRitual,
    int CurrentStreak,
    int LongestStreak,
    IReadOnlyList<HabitLogDto> RecentLogs,
    bool NotificationEnabled,
    int? ReminderHour,
    int? ReminderMinute);

// ── GoalProgressSnapshot ──────────────────────────────────────────────────────
public record GoalProgressSnapshotDto(
    Guid Id,
    Guid GoalId,
    int ProgressPercent,
    DateOnly SnapshotDate);

// ── Mappings ──────────────────────────────────────────────────────────────────
public static class GoalMappings
{
    private static string[] ParseValues(string json)
    {
        try { return JsonSerializer.Deserialize<string[]>(json) ?? []; }
        catch { return []; }
    }

    public static GoalDto ToDto(this Goal g) => new(
        g.Id, g.Year, g.Title,
        g.GoalType.ToString(), g.Status.ToString(), g.LifeArea.ToString(), g.EnergyLevel.ToString(),
        g.WhyItMatters, g.TargetDate,
        ParseValues(g.AlignedValueNames),
        g.ProgressPercent,
        g.CompletedAt,
        g.SmartGoal?.ToDto(),
        g.WoopReflection?.ToDto(),
        (g.Milestones ?? []).Select(m => m.ToDto()).ToList().AsReadOnly());

    public static GoalProgressSnapshotDto ToDto(this GoalProgressSnapshot s) => new(
        s.Id, s.GoalId, s.ProgressPercent, s.SnapshotDate);

    public static SmartGoalDto ToDto(this SmartGoal s) => new(
        s.Id, s.Specific, s.Measurable, s.Achievable, s.Relevant, s.TimeBound);

    public static WoopReflectionDto ToDto(this WoopReflection w) => new(
        w.Id, w.Wish, w.Outcome, w.Obstacle, w.Plan);

    public static MilestoneDto ToDto(this Milestone m) => new(
        m.Id, m.Title, m.TargetDate, m.IsComplete, m.OrderIndex,
        (m.Tasks ?? []).Select(t => t.ToDto()).ToList().AsReadOnly());

    public static TaskDto ToDto(this TaskItem t) => new(
        t.Id, t.GoalId, t.MilestoneId, t.Title,
        t.Status.ToString(), t.EnergyLevel.ToString(),
        t.EstimatedMinutes, t.DueDate, t.IsNextAction);

    public static HabitDto ToDto(this Habit h)
    {
        var cutoff = DateTime.UtcNow.AddDays(-30);
        var recentLogs = (h.Logs ?? [])
            .Where(l => l.LoggedDate >= cutoff)
            .OrderBy(l => l.LoggedDate)
            .Select(l => new HabitLogDto(l.Id, l.LoggedDate, l.Notes, l.DurationMinutes))
            .ToList()
            .AsReadOnly();
        return new(
            h.Id, h.GoalId, h.Title,
            h.Frequency.ToString(), h.TrackingMethod.ToString(),
            h.MinimumViableDose, h.IdealDose, h.Trigger, h.CelebrationRitual,
            h.CurrentStreak, h.LongestStreak, recentLogs,
            h.NotificationEnabled, h.ReminderHour, h.ReminderMinute);
    }
}
