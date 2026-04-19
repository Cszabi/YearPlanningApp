using System.Globalization;
using Mediator;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Dashboard;

// ── DTOs ──────────────────────────────────────────────────────────────────────

public record DashboardDto(
    string? NorthStar,
    List<string> TopValues,
    IkigaiDistributionDto IkigaiDistribution,
    string DailyQuestion,
    DashboardTaskDto? NextAction,
    List<DashboardTaskDto> TodaysTasks,
    List<DashboardHabitDto> TodaysHabits,
    DashboardDeadlineDto? NearestDeadline,
    List<int> WeeklyFlowMinutes,
    int ActiveGoalCount,
    DashboardFlowInsightDto? FlowInsight,
    ReviewStatusType ReviewStatus,
    int HabitStreakRiskCount,
    DashboardReflectionDto? LastReflection);

public record IkigaiDistributionDto(
    int Love, int GoodAt, int WorldNeeds, int PaidFor, int Intersection);

public record DashboardTaskDto(
    Guid Id, Guid GoalId, string Title, string GoalTitle,
    string Status, DateTime? DueDate, bool IsNextAction);

public record DashboardHabitDto(
    Guid GoalId, Guid HabitId, string Title, int CurrentStreak,
    bool LoggedToday, string Frequency);

public record DashboardDeadlineDto(
    Guid GoalId, string Title, DateTime TargetDate, int DaysRemaining);

public record DashboardFlowInsightDto(
    string? BestDayOfWeek, int? BestHourOfDay, int TotalDeepWorkMinutesThisWeek);

public record DashboardReflectionDto(string Content, DateTimeOffset CreatedAt);

public enum ReviewStatusType { Done, Pending, Overdue }

// ── Query ─────────────────────────────────────────────────────────────────────

public record GetDashboardQuery : IQuery<DashboardDto>, IAuthenticatedCommand;

public class GetDashboardQueryHandler : IQueryHandler<GetDashboardQuery, DashboardDto>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetDashboardQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<DashboardDto> Handle(GetDashboardQuery _query, CancellationToken ct)
    {
        var userId = _currentUser.UserId;
        var year = DateTime.UtcNow.Year;
        var today = DateTime.UtcNow.Date;

        // ── Sequential queries (DbContext is not thread-safe) ────────────────
        var journey = await _uow.Ikigai.GetJourneyByUserAndYearAsync(userId, year, ct);
        var values = (await _uow.Ikigai.GetValuesByUserAndYearAsync(userId, year, ct)).ToList();
        var mindMap = await _uow.MindMaps.GetByUserAndYearAsync(userId, year, ct);
        var goals = (await _uow.Goals.GetByUserAndYearAsync(userId, year, ct)).ToList();
        var habits = (await _uow.Habits.GetByUserAndYearAsync(userId, year, ct)).ToList();
        var sessions = (await _uow.FlowSessions.GetSessionsByDateRangeAsync(
            userId, today.AddDays(-30), today.AddDays(1), ct)).ToList();
        var reviews = (await _uow.Reviews.GetByUserAndYearAsync(
            userId, ReviewType.Weekly, year, ct)).ToList();

        // ── North Star ────────────────────────────────────────────────────────
        var northStar = journey?.NorthStar?.Statement;

        // ── Top 3 Values ──────────────────────────────────────────────────────
        var topValues = values
            .OrderBy(v => v.Rank)
            .Take(3)
            .Select(v => v.ValueName)
            .ToList();

        // ── Ikigai Distribution ───────────────────────────────────────────────
        var nodes = mindMap?.Nodes?.ToList() ?? [];
        var dist = new IkigaiDistributionDto(
            Love: nodes.Count(n => n.IkigaiCategory == IkigaiCategory.Love),
            GoodAt: nodes.Count(n => n.IkigaiCategory == IkigaiCategory.GoodAt),
            WorldNeeds: nodes.Count(n => n.IkigaiCategory == IkigaiCategory.WorldNeeds),
            PaidFor: nodes.Count(n => n.IkigaiCategory == IkigaiCategory.PaidFor),
            Intersection: nodes.Count(n => n.IkigaiCategory == IkigaiCategory.Intersection));

        // ── Daily Question ────────────────────────────────────────────────────
        var dailyQuestion = DailyQuestionProvider.GetQuestion(userId, DateTimeOffset.UtcNow);

        // ── Active goals ──────────────────────────────────────────────────────
        var activeGoals = goals.Where(g => g.Status == GoalStatus.Active).ToList();

        // ── Extract all tasks from goals (already loaded with milestones) ─────
        var allTasks = activeGoals
            .SelectMany(g => (g.Milestones ?? Enumerable.Empty<Milestone>())
                .SelectMany(m => (m.Tasks ?? Enumerable.Empty<TaskItem>())
                    .Select(t => (Task: t, GoalTitle: g.Title))))
            .ToList();

        // ── Next Action ───────────────────────────────────────────────────────
        var nextActionItem = allTasks
            .Where(x => x.Task.IsNextAction && x.Task.Status != TaskItemStatus.Done)
            .OrderBy(x => x.Task.DueDate ?? DateTime.MaxValue)
            .FirstOrDefault();

        DashboardTaskDto? nextAction = null;
        if (nextActionItem.Task != null)
        {
            var t = nextActionItem.Task;
            nextAction = new DashboardTaskDto(
                t.Id, t.GoalId, t.Title, nextActionItem.GoalTitle,
                t.Status.ToString(), t.DueDate, t.IsNextAction);
        }

        // ── Today's Tasks (due today or overdue, max 5) ──────────────────────
        var todaysTaskDtos = allTasks
            .Where(x => x.Task.Status != TaskItemStatus.Done
                      && x.Task.DueDate.HasValue
                      && x.Task.DueDate.Value.Date <= today)
            .OrderByDescending(x => x.Task.IsNextAction)
            .ThenBy(x => x.Task.DueDate)
            .Take(5)
            .Select(x =>
            {
                var t = x.Task;
                return new DashboardTaskDto(
                    t.Id, t.GoalId, t.Title, x.GoalTitle,
                    t.Status.ToString(), t.DueDate, t.IsNextAction);
            })
            .ToList();

        // ── Today's Habits ────────────────────────────────────────────────────
        var todaysHabits = habits
            .Select(h =>
            {
                var loggedToday = h.Logs?.Any(l => l.LoggedDate.Date == today) ?? false;
                return new DashboardHabitDto(
                    h.GoalId, h.Id, h.Title, h.CurrentStreak,
                    loggedToday, h.Frequency.ToString());
            })
            .ToList();

        // ── Nearest Deadline ──────────────────────────────────────────────────
        var nearestDeadlineGoal = activeGoals
            .Where(g => g.GoalType == GoalType.Project && g.TargetDate.HasValue && g.TargetDate.Value.Date >= today)
            .OrderBy(g => g.TargetDate)
            .FirstOrDefault();

        DashboardDeadlineDto? nearestDeadline = null;
        if (nearestDeadlineGoal?.TargetDate != null)
        {
            var daysRemaining = (nearestDeadlineGoal.TargetDate.Value.Date - today).Days;
            nearestDeadline = new DashboardDeadlineDto(
                nearestDeadlineGoal.Id, nearestDeadlineGoal.Title,
                nearestDeadlineGoal.TargetDate.Value, daysRemaining);
        }

        // ── Weekly Flow Minutes (last 7 days) ─────────────────────────────────
        var weekStart = today.AddDays(-6);
        var weekSessions = sessions.Where(s => s.EndedAt.HasValue && s.StartedAt.Date >= weekStart).ToList();
        var weeklyFlowMinutes = Enumerable.Range(0, 7)
            .Select(i =>
            {
                var day = weekStart.AddDays(i);
                return weekSessions
                    .Where(s => s.StartedAt.Date == day)
                    .Sum(s => s.ActualMinutes ?? s.PlannedMinutes);
            })
            .ToList();

        // ── Flow Insight ──────────────────────────────────────────────────────
        var qualitySessions = sessions
            .Where(s => s.FlowQualityRating.HasValue && s.FlowQualityRating >= 4 && s.EndedAt.HasValue)
            .ToList();

        DashboardFlowInsightDto? flowInsight = null;
        var totalWeekMinutes = weekSessions.Sum(s => s.ActualMinutes ?? s.PlannedMinutes);
        if (qualitySessions.Count > 0)
        {
            var bestDay = qualitySessions
                .GroupBy(s => s.StartedAt.DayOfWeek)
                .OrderByDescending(g => g.Average(s => s.FlowQualityRating!.Value))
                .First();

            var bestHour = qualitySessions
                .GroupBy(s => s.StartedAt.Hour)
                .OrderByDescending(g => g.Average(s => s.FlowQualityRating!.Value))
                .First();

            flowInsight = new DashboardFlowInsightDto(
                bestDay.Key.ToString(), bestHour.Key, totalWeekMinutes);
        }
        else if (totalWeekMinutes > 0)
        {
            flowInsight = new DashboardFlowInsightDto(null, null, totalWeekMinutes);
        }

        // ── Review Status ─────────────────────────────────────────────────────
        var isoWeek = ISOWeek.GetWeekOfYear(today);
        var isoYear = ISOWeek.GetYear(today);
        var weekStartDate = ISOWeek.ToDateTime(isoYear, isoWeek, DayOfWeek.Monday);
        var weekEndDate = weekStartDate.AddDays(7);

        var thisWeekReview = reviews.FirstOrDefault(r =>
            r.PeriodStart >= weekStartDate && r.PeriodStart < weekEndDate && r.IsComplete);

        ReviewStatusType reviewStatus;
        if (thisWeekReview != null)
        {
            reviewStatus = ReviewStatusType.Done;
        }
        else
        {
            var latestComplete = reviews
                .Where(r => r.IsComplete)
                .OrderByDescending(r => r.CompletedAt ?? r.CreatedAt)
                .FirstOrDefault();

            if (latestComplete != null &&
                (today - (latestComplete.CompletedAt ?? latestComplete.CreatedAt).Date).TotalDays > 10)
            {
                reviewStatus = ReviewStatusType.Overdue;
            }
            else
            {
                reviewStatus = ReviewStatusType.Pending;
            }
        }

        // ── Habit Streak Risk Count ───────────────────────────────────────────
        var habitStreakRiskCount = todaysHabits
            .Count(h => h.CurrentStreak > 0 && !h.LoggedToday);

        // ── Last Reflection ───────────────────────────────────────────────────
        var latestReview = reviews
            .Where(r => r.IsComplete && !string.IsNullOrWhiteSpace(r.Answers))
            .OrderByDescending(r => r.CompletedAt ?? r.CreatedAt)
            .FirstOrDefault();

        DashboardReflectionDto? lastReflection = null;
        if (latestReview != null)
        {
            var content = ExtractFirstSentence(latestReview.Answers, 200);
            if (!string.IsNullOrWhiteSpace(content))
            {
                lastReflection = new DashboardReflectionDto(
                    content,
                    latestReview.CompletedAt ?? latestReview.CreatedAt);
            }
        }

        return new DashboardDto(
            northStar, topValues, dist, dailyQuestion,
            nextAction, todaysTaskDtos, todaysHabits,
            nearestDeadline, weeklyFlowMinutes, activeGoals.Count,
            flowInsight, reviewStatus, habitStreakRiskCount,
            lastReflection);
    }

    private static string ExtractFirstSentence(string answersJson, int maxLength)
    {
        try
        {
            var doc = System.Text.Json.JsonDocument.Parse(answersJson);
            foreach (var prop in doc.RootElement.EnumerateObject())
            {
                var val = prop.Value.ValueKind == System.Text.Json.JsonValueKind.String
                    ? prop.Value.GetString()
                    : null;
                if (string.IsNullOrWhiteSpace(val)) continue;

                var dotIndex = val.IndexOf('.', StringComparison.Ordinal);
                var text = dotIndex > 0 && dotIndex < maxLength
                    ? val[..(dotIndex + 1)]
                    : val.Length > maxLength ? val[..maxLength] + "..." : val;
                return text.Trim();
            }
        }
        catch
        {
            var text = answersJson.Length > maxLength
                ? answersJson[..maxLength] + "..."
                : answersJson;
            return text;
        }

        return "";
    }
}
