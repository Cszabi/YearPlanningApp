using Mediator;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Reviews;

public record GetWeeklyDataQuery(DateTime WeekStart)
    : IQuery<WeeklyReviewDataDto>, IAuthenticatedCommand;

public class GetWeeklyDataQueryHandler
    : IQueryHandler<GetWeeklyDataQuery, WeeklyReviewDataDto>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetWeeklyDataQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<WeeklyReviewDataDto> Handle(GetWeeklyDataQuery query, CancellationToken ct)
    {
        var userId    = _currentUser.UserId;
        var weekStart = query.WeekStart.ToUniversalTime();
        var weekEnd   = weekStart.AddDays(7);
        var year      = weekStart.Year;

        // ── Goals ─────────────────────────────────────────────────────────────
        var goals = (await _uow.Goals.GetByUserAndYearAsync(userId, year, ct)).ToList();
        var goalTitles = goals.ToDictionary(g => g.Id, g => g.Title);

        var activeGoals = goals
            .Where(g => g.Status == GoalStatus.Active)
            .Select(g => new GoalSummaryDto(g.Id.ToString(), g.Title, g.GoalType.ToString(), g.ProgressPercent))
            .ToList();

        // ── Completed / carried-over tasks ────────────────────────────────────
        var completedTasks  = new List<CompletedTaskSummaryDto>();
        var carriedOverTasks = new List<CompletedTaskSummaryDto>();

        foreach (var goal in goals)
        {
            var tasks = await _uow.Tasks.GetByGoalIdAsync(goal.Id, ct);
            var title = goalTitles.GetValueOrDefault(goal.Id, "");

            foreach (var task in tasks)
            {
                if (task.Status == TaskItemStatus.Done
                    && task.UpdatedAt >= weekStart && task.UpdatedAt < weekEnd)
                {
                    completedTasks.Add(new CompletedTaskSummaryDto(task.Id.ToString(), task.Title, title));
                }
                else if (task.Status != TaskItemStatus.Done
                    && task.DueDate.HasValue
                    && task.DueDate.Value >= weekStart && task.DueDate.Value < weekEnd)
                {
                    carriedOverTasks.Add(new CompletedTaskSummaryDto(task.Id.ToString(), task.Title, title));
                }
            }
        }

        // ── Habits ────────────────────────────────────────────────────────────
        var habits = (await _uow.Habits.GetByUserAndYearAsync(userId, year, ct)).ToList();
        var habitSummaries = new List<HabitWeeklySummaryDto>();

        foreach (var habit in habits)
        {
            var logs = await _uow.Habits.GetLogsByHabitAndDateRangeAsync(habit.Id, weekStart, weekEnd, ct);
            var daysCompleted = logs.Count();
            var daysExpected = habit.Frequency switch
            {
                HabitFrequency.Daily   => 7,
                HabitFrequency.Weekly  => 1,
                HabitFrequency.Monthly => 1,
                _                      => 7,
            };
            habitSummaries.Add(new HabitWeeklySummaryDto(habit.Id.ToString(), habit.Title, daysCompleted, daysExpected));
        }

        // ── Flow sessions ─────────────────────────────────────────────────────
        var sessions = (await _uow.FlowSessions.GetSessionsByDateRangeAsync(userId, weekStart, weekEnd, ct)).ToList();
        var sessionCount = sessions.Count;
        var totalMinutes = sessions.Sum(s => s.ActualMinutes ?? s.PlannedMinutes);
        var qualitySessions = sessions.Where(s => s.FlowQualityRating.HasValue).ToList();
        double? avgQuality = qualitySessions.Count > 0
            ? qualitySessions.Average(s => s.FlowQualityRating!.Value)
            : null;
        var bestOutcome = sessions
            .Where(s => s.Outcome.HasValue)
            .OrderBy(s => s.Outcome!.Value)
            .FirstOrDefault()?.Outcome?.ToString();

        var flowSummary = new FlowWeeklySummaryDto(sessionCount, totalMinutes, avgQuality, bestOutcome);

        return new WeeklyReviewDataDto(
            weekStart.ToString("yyyy-MM-dd"),
            completedTasks,
            carriedOverTasks,
            habitSummaries,
            flowSummary,
            activeGoals);
    }
}
