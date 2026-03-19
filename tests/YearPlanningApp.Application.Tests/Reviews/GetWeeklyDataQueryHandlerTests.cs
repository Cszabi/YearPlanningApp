using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Reviews;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Reviews;

public class GetWeeklyDataQueryHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly GetWeeklyDataQueryHandler _handler;

    private static readonly DateTime WeekStart = new DateTime(2026, 3, 16, 0, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime WeekEnd   = WeekStart.AddDays(7);

    public GetWeeklyDataQueryHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new GetWeeklyDataQueryHandler(_uow, _currentUser);

        // defaults: empty collections
        _uow.Goals.GetByUserAndYearAsync(_userId, Arg.Any<int>(), Arg.Any<CancellationToken>())
            .Returns(Array.Empty<Goal>());
        _uow.Habits.GetByUserAndYearAsync(_userId, Arg.Any<int>(), Arg.Any<CancellationToken>())
            .Returns(Array.Empty<Habit>());
        _uow.FlowSessions.GetSessionsByDateRangeAsync(_userId, Arg.Any<DateTime>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns(Array.Empty<FlowSession>());
    }

    private Goal BuildGoal() => new()
    {
        Id = Guid.NewGuid(), UserId = _userId, Year = 2026, Title = "G",
        GoalType = GoalType.Project, Status = GoalStatus.Active, LifeArea = LifeArea.CareerWork,
        EnergyLevel = EnergyLevel.Deep, AlignedValueNames = "[]", Milestones = new List<Milestone>()
    };

    private Habit BuildHabit(Guid goalId) => new()
    {
        Id = Guid.NewGuid(), GoalId = goalId, UserId = _userId,
        Title = "H", TrackingMethod = HabitTrackingMethod.YesNo,
        Frequency = HabitFrequency.Daily, MinimumViableDose = "1x",
        CurrentStreak = 0, LongestStreak = 0
    };

    [Fact]
    public async Task Handle_ShouldReturnCompletedTasks_WhenUpdatedInWeek()
    {
        var goal = BuildGoal();
        var task = new TaskItem
        {
            Id = Guid.NewGuid(), GoalId = goal.Id, MilestoneId = Guid.NewGuid(),
            Title = "Done task", Status = TaskItemStatus.Done,
            EnergyLevel = EnergyLevel.Deep,
            UpdatedAt = WeekStart.AddDays(1) // within the week
        };

        _uow.Goals.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(new[] { goal });
        _uow.Tasks.GetByGoalIdAsync(goal.Id, Arg.Any<CancellationToken>()).Returns(new[] { task });

        var result = await _handler.Handle(new GetWeeklyDataQuery(WeekStart), CancellationToken.None);

        result.CompletedTasks.Count.ShouldBe(1);
        result.CompletedTasks[0].Title.ShouldBe("Done task");
        result.CarriedOverTasks.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_ShouldReturnCarriedOverTasks_WhenDueInWeekButNotDone()
    {
        var goal = BuildGoal();
        var task = new TaskItem
        {
            Id = Guid.NewGuid(), GoalId = goal.Id, MilestoneId = Guid.NewGuid(),
            Title = "Overdue task", Status = TaskItemStatus.InProgress,
            EnergyLevel = EnergyLevel.Deep,
            DueDate = WeekStart.AddDays(2) // due in the week
        };

        _uow.Goals.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(new[] { goal });
        _uow.Tasks.GetByGoalIdAsync(goal.Id, Arg.Any<CancellationToken>()).Returns(new[] { task });

        var result = await _handler.Handle(new GetWeeklyDataQuery(WeekStart), CancellationToken.None);

        result.CarriedOverTasks.Count.ShouldBe(1);
        result.CarriedOverTasks[0].Title.ShouldBe("Overdue task");
        result.CompletedTasks.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_ShouldComputeHabitDaysExpected_ByFrequency()
    {
        var goal = BuildGoal();
        var dailyHabit  = BuildHabit(goal.Id);
        dailyHabit.Frequency = HabitFrequency.Daily;
        var weeklyHabit = BuildHabit(goal.Id);
        weeklyHabit.Frequency = HabitFrequency.Weekly;

        _uow.Goals.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(new[] { goal });
        _uow.Tasks.GetByGoalIdAsync(goal.Id, Arg.Any<CancellationToken>()).Returns(Array.Empty<TaskItem>());
        _uow.Habits.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns(new[] { dailyHabit, weeklyHabit });
        _uow.Habits.GetLogsByHabitAndDateRangeAsync(Arg.Any<Guid>(), Arg.Any<DateTime>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns(Array.Empty<HabitLog>());

        var result = await _handler.Handle(new GetWeeklyDataQuery(WeekStart), CancellationToken.None);

        result.HabitSummaries.Count.ShouldBe(2);
        result.HabitSummaries.Single(h => h.HabitId == dailyHabit.Id.ToString()).DaysExpected.ShouldBe(7);
        result.HabitSummaries.Single(h => h.HabitId == weeklyHabit.Id.ToString()).DaysExpected.ShouldBe(1);
    }

    [Fact]
    public async Task Handle_ShouldAggregateFlowSessions()
    {
        var sessions = new[]
        {
            new FlowSession
            {
                Id = Guid.NewGuid(), UserId = _userId, PlannedMinutes = 60, ActualMinutes = 50,
                FlowQualityRating = 4, Outcome = FlowSessionOutcome.Fully,
                StartedAt = WeekStart, EnergyLevel = EnergyLevel.Deep, AmbientSound = AmbientSoundMode.None
            },
            new FlowSession
            {
                Id = Guid.NewGuid(), UserId = _userId, PlannedMinutes = 30, ActualMinutes = 30,
                FlowQualityRating = 2, Outcome = FlowSessionOutcome.Partially,
                StartedAt = WeekStart.AddDays(1), EnergyLevel = EnergyLevel.Deep, AmbientSound = AmbientSoundMode.None
            }
        };

        _uow.FlowSessions.GetSessionsByDateRangeAsync(_userId, Arg.Any<DateTime>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns(sessions);

        var result = await _handler.Handle(new GetWeeklyDataQuery(WeekStart), CancellationToken.None);

        result.FlowSummary.SessionCount.ShouldBe(2);
        result.FlowSummary.TotalMinutes.ShouldBe(80); // 50 + 30
        result.FlowSummary.AvgFlowQuality.ShouldBe(3.0); // (4+2)/2
    }

    [Fact]
    public async Task Handle_ShouldReturnEmptyResult_WhenNoData()
    {
        var result = await _handler.Handle(new GetWeeklyDataQuery(WeekStart), CancellationToken.None);

        result.CompletedTasks.ShouldBeEmpty();
        result.CarriedOverTasks.ShouldBeEmpty();
        result.HabitSummaries.ShouldBeEmpty();
        result.ActiveGoals.ShouldBeEmpty();
        result.FlowSummary.SessionCount.ShouldBe(0);
        result.FlowSummary.TotalMinutes.ShouldBe(0);
        result.FlowSummary.AvgFlowQuality.ShouldBeNull();
    }

    [Fact]
    public async Task Handle_ShouldOnlyIncludeActiveGoals_InActiveGoalsList()
    {
        var activeGoal = BuildGoal();
        activeGoal.Status = GoalStatus.Active;
        var pausedGoal = BuildGoal();
        pausedGoal.Status = GoalStatus.Paused;

        _uow.Goals.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns(new[] { activeGoal, pausedGoal });
        _uow.Tasks.GetByGoalIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(Array.Empty<TaskItem>());

        var result = await _handler.Handle(new GetWeeklyDataQuery(WeekStart), CancellationToken.None);

        result.ActiveGoals.Count.ShouldBe(1);
        result.ActiveGoals[0].Id.ShouldBe(activeGoal.Id.ToString());
    }
}
