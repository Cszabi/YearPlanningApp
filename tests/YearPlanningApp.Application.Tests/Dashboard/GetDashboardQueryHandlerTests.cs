using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Dashboard;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Dashboard;

public class GetDashboardQueryHandlerTests
{
    private static readonly Guid UserId = Guid.NewGuid();
    private static readonly int Year = DateTime.UtcNow.Year;
    private static readonly DateTime Today = DateTime.UtcNow.Date;

    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly GetDashboardQueryHandler _handler;

    public GetDashboardQueryHandlerTests()
    {
        _currentUser.UserId.Returns(UserId);

        // Default: return empty data for everything
        _uow.Ikigai.GetJourneyByUserAndYearAsync(UserId, Year, Arg.Any<CancellationToken>())
            .Returns((IkigaiJourney?)null);
        _uow.Ikigai.GetValuesByUserAndYearAsync(UserId, Year, Arg.Any<CancellationToken>())
            .Returns(Enumerable.Empty<UserValue>());
        _uow.MindMaps.GetByUserAndYearAsync(UserId, Year, Arg.Any<CancellationToken>())
            .Returns((Domain.Entities.MindMap?)null);
        _uow.Goals.GetByUserAndYearAsync(UserId, Year, Arg.Any<CancellationToken>())
            .Returns(Enumerable.Empty<Goal>());
        _uow.Habits.GetByUserAndYearAsync(UserId, Year, Arg.Any<CancellationToken>())
            .Returns(Enumerable.Empty<Habit>());
        _uow.FlowSessions.GetSessionsByDateRangeAsync(UserId, Arg.Any<DateTime>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns(Enumerable.Empty<FlowSession>());
        _uow.Reviews.GetByUserAndYearAsync(UserId, ReviewType.Weekly, Year, Arg.Any<CancellationToken>())
            .Returns(Enumerable.Empty<Review>());

        _handler = new GetDashboardQueryHandler(_uow, _currentUser);
    }

    [Fact]
    public async Task Handle_ShouldReturnDto_WithEmptyData_WhenUserHasNoData()
    {
        var result = await _handler.Handle(new GetDashboardQuery(), CancellationToken.None);

        result.NorthStar.ShouldBeNull();
        result.TopValues.ShouldBeEmpty();
        result.ActiveGoalCount.ShouldBe(0);
        result.NextAction.ShouldBeNull();
        result.TodaysTasks.ShouldBeEmpty();
        result.TodaysHabits.ShouldBeEmpty();
        result.NearestDeadline.ShouldBeNull();
        result.FlowInsight.ShouldBeNull();
        result.LastReflection.ShouldBeNull();
        result.DailyQuestion.ShouldNotBeNullOrWhiteSpace();
        result.WeeklyFlowMinutes.Count.ShouldBe(7);
    }

    [Fact]
    public async Task Handle_ShouldReturnNorthStar_WhenJourneyHasNorthStar()
    {
        var journey = new IkigaiJourney
        {
            Id = Guid.NewGuid(),
            UserId = UserId,
            Year = Year,
            NorthStar = new NorthStar
            {
                Id = Guid.NewGuid(),
                UserId = UserId,
                Year = Year,
                Statement = "Create tools that help people live intentionally"
            }
        };

        _uow.Ikigai.GetJourneyByUserAndYearAsync(UserId, Year, Arg.Any<CancellationToken>())
            .Returns(journey);

        var result = await _handler.Handle(new GetDashboardQuery(), CancellationToken.None);

        result.NorthStar.ShouldBe("Create tools that help people live intentionally");
    }

    [Fact]
    public async Task Handle_ShouldReturnTop3Values_OrderedByRank()
    {
        var values = new List<UserValue>
        {
            new() { Id = Guid.NewGuid(), UserId = UserId, Year = Year, ValueName = "Courage", Rank = 3 },
            new() { Id = Guid.NewGuid(), UserId = UserId, Year = Year, ValueName = "Creativity", Rank = 1 },
            new() { Id = Guid.NewGuid(), UserId = UserId, Year = Year, ValueName = "Growth", Rank = 2 },
            new() { Id = Guid.NewGuid(), UserId = UserId, Year = Year, ValueName = "Freedom", Rank = 4 },
            new() { Id = Guid.NewGuid(), UserId = UserId, Year = Year, ValueName = "Love", Rank = 5 },
        };

        _uow.Ikigai.GetValuesByUserAndYearAsync(UserId, Year, Arg.Any<CancellationToken>())
            .Returns(values);

        var result = await _handler.Handle(new GetDashboardQuery(), CancellationToken.None);

        result.TopValues.Count.ShouldBe(3);
        result.TopValues[0].ShouldBe("Creativity");
        result.TopValues[1].ShouldBe("Growth");
        result.TopValues[2].ShouldBe("Courage");
    }

    [Fact]
    public async Task Handle_ShouldCountIkigaiDistribution()
    {
        var mindMap = new Domain.Entities.MindMap
        {
            Id = Guid.NewGuid(),
            UserId = UserId,
            Year = Year,
            Nodes = new List<MindMapNode>
            {
                new() { Id = Guid.NewGuid(), NodeType = MindMapNodeType.Root, Label = "Me", IkigaiCategory = null },
                new() { Id = Guid.NewGuid(), NodeType = MindMapNodeType.Branch, Label = "Writing", IkigaiCategory = IkigaiCategory.Love },
                new() { Id = Guid.NewGuid(), NodeType = MindMapNodeType.Branch, Label = "Coding", IkigaiCategory = IkigaiCategory.GoodAt },
                new() { Id = Guid.NewGuid(), NodeType = MindMapNodeType.Branch, Label = "Coding2", IkigaiCategory = IkigaiCategory.GoodAt },
                new() { Id = Guid.NewGuid(), NodeType = MindMapNodeType.Leaf, Label = "Teaching", IkigaiCategory = IkigaiCategory.WorldNeeds },
            }
        };

        _uow.MindMaps.GetByUserAndYearAsync(UserId, Year, Arg.Any<CancellationToken>())
            .Returns(mindMap);

        var result = await _handler.Handle(new GetDashboardQuery(), CancellationToken.None);

        result.IkigaiDistribution.Love.ShouldBe(1);
        result.IkigaiDistribution.GoodAt.ShouldBe(2);
        result.IkigaiDistribution.WorldNeeds.ShouldBe(1);
        result.IkigaiDistribution.PaidFor.ShouldBe(0);
        result.IkigaiDistribution.Intersection.ShouldBe(0);
    }

    [Fact]
    public async Task Handle_ShouldReturnNextAction_WhenTaskIsMarkedAsNextAction()
    {
        var goalId = Guid.NewGuid();
        var milestoneId = Guid.NewGuid();
        var taskId = Guid.NewGuid();

        var goals = new List<Goal>
        {
            new()
            {
                Id = goalId, UserId = UserId, Year = Year,
                Title = "Learn Rust", Status = GoalStatus.Active,
                GoalType = GoalType.Project, LifeArea = LifeArea.LearningGrowth,
                EnergyLevel = EnergyLevel.Deep, AlignedValueNames = "[]",
                Milestones = new List<Milestone>
                {
                    new()
                    {
                        Id = milestoneId, GoalId = goalId, Title = "Basics",
                        Tasks = new List<TaskItem>
                        {
                            new()
                            {
                                Id = taskId, GoalId = goalId, MilestoneId = milestoneId,
                                Title = "Read chapter 1", Status = TaskItemStatus.NotStarted,
                                IsNextAction = true, DueDate = Today,
                                EnergyLevel = EnergyLevel.Deep, AlignedValueNames = "[]",
                            }
                        }
                    }
                }
            }
        };

        _uow.Goals.GetByUserAndYearAsync(UserId, Year, Arg.Any<CancellationToken>())
            .Returns(goals);

        var result = await _handler.Handle(new GetDashboardQuery(), CancellationToken.None);

        result.NextAction.ShouldNotBeNull();
        result.NextAction!.Title.ShouldBe("Read chapter 1");
        result.NextAction.GoalTitle.ShouldBe("Learn Rust");
        result.NextAction.IsNextAction.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnNearestDeadline_WhenGoalHasTargetDate()
    {
        var goalId = Guid.NewGuid();
        var targetDate = Today.AddDays(5);

        var goals = new List<Goal>
        {
            new()
            {
                Id = goalId, UserId = UserId, Year = Year,
                Title = "Ship MVP", Status = GoalStatus.Active,
                GoalType = GoalType.Project, LifeArea = LifeArea.CareerWork,
                EnergyLevel = EnergyLevel.Deep, AlignedValueNames = "[]",
                TargetDate = targetDate,
                Milestones = new List<Milestone>()
            }
        };

        _uow.Goals.GetByUserAndYearAsync(UserId, Year, Arg.Any<CancellationToken>())
            .Returns(goals);

        var result = await _handler.Handle(new GetDashboardQuery(), CancellationToken.None);

        result.NearestDeadline.ShouldNotBeNull();
        result.NearestDeadline!.Title.ShouldBe("Ship MVP");
        result.NearestDeadline.DaysRemaining.ShouldBe(5);
    }

    [Fact]
    public async Task Handle_ShouldComputeFlowInsights_WhenHighQualitySessions()
    {
        var sessions = new List<FlowSession>
        {
            new()
            {
                Id = Guid.NewGuid(), UserId = UserId,
                PlannedMinutes = 25, ActualMinutes = 30,
                StartedAt = Today.AddHours(9),
                EndedAt = Today.AddHours(9).AddMinutes(30),
                FlowQualityRating = 5,
                AmbientSound = AmbientSoundMode.None,
                EnergyLevel = EnergyLevel.Deep,
            },
            new()
            {
                Id = Guid.NewGuid(), UserId = UserId,
                PlannedMinutes = 25, ActualMinutes = 25,
                StartedAt = Today.AddHours(14),
                EndedAt = Today.AddHours(14).AddMinutes(25),
                FlowQualityRating = 4,
                AmbientSound = AmbientSoundMode.None,
                EnergyLevel = EnergyLevel.Deep,
            },
        };

        _uow.FlowSessions.GetSessionsByDateRangeAsync(UserId, Arg.Any<DateTime>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns(sessions);

        var result = await _handler.Handle(new GetDashboardQuery(), CancellationToken.None);

        result.FlowInsight.ShouldNotBeNull();
        result.FlowInsight!.TotalDeepWorkMinutesThisWeek.ShouldBeGreaterThan(0);
        result.FlowInsight.BestDayOfWeek.ShouldNotBeNull();
        result.FlowInsight.BestHourOfDay.ShouldNotBeNull();
    }

    [Fact]
    public async Task Handle_ShouldReturnReviewDone_WhenThisWeekReviewIsComplete()
    {
        var isoWeek = System.Globalization.ISOWeek.GetWeekOfYear(Today);
        var isoYear = System.Globalization.ISOWeek.GetYear(Today);
        var weekStart = System.Globalization.ISOWeek.ToDateTime(isoYear, isoWeek, DayOfWeek.Monday);

        var reviews = new List<Review>
        {
            new()
            {
                Id = Guid.NewGuid(), UserId = UserId,
                ReviewType = ReviewType.Weekly,
                PeriodStart = weekStart,
                PeriodEnd = weekStart.AddDays(7),
                IsComplete = true,
                CompletedAt = Today,
                Answers = "{}"
            }
        };

        _uow.Reviews.GetByUserAndYearAsync(UserId, ReviewType.Weekly, Year, Arg.Any<CancellationToken>())
            .Returns(reviews);

        var result = await _handler.Handle(new GetDashboardQuery(), CancellationToken.None);

        result.ReviewStatus.ShouldBe(ReviewStatusType.Done);
    }

    [Fact]
    public async Task Handle_ShouldReturnReviewOverdue_WhenLastReviewOlderThan10Days()
    {
        var reviews = new List<Review>
        {
            new()
            {
                Id = Guid.NewGuid(), UserId = UserId,
                ReviewType = ReviewType.Weekly,
                PeriodStart = Today.AddDays(-20),
                PeriodEnd = Today.AddDays(-13),
                IsComplete = true,
                CompletedAt = Today.AddDays(-15),
                Answers = "{}"
            }
        };

        _uow.Reviews.GetByUserAndYearAsync(UserId, ReviewType.Weekly, Year, Arg.Any<CancellationToken>())
            .Returns(reviews);

        var result = await _handler.Handle(new GetDashboardQuery(), CancellationToken.None);

        result.ReviewStatus.ShouldBe(ReviewStatusType.Overdue);
    }

    [Fact]
    public async Task Handle_ShouldReturnLastReflection_WhenReviewHasAnswers()
    {
        var reviews = new List<Review>
        {
            new()
            {
                Id = Guid.NewGuid(), UserId = UserId,
                ReviewType = ReviewType.Weekly,
                PeriodStart = Today.AddDays(-10),
                PeriodEnd = Today.AddDays(-3),
                IsComplete = true,
                CompletedAt = Today.AddDays(-3),
                Answers = "{\"wins\": \"Shipped the dashboard feature. Users love it.\"}"
            }
        };

        _uow.Reviews.GetByUserAndYearAsync(UserId, ReviewType.Weekly, Year, Arg.Any<CancellationToken>())
            .Returns(reviews);

        var result = await _handler.Handle(new GetDashboardQuery(), CancellationToken.None);

        result.LastReflection.ShouldNotBeNull();
        result.LastReflection!.Content.ShouldContain("Shipped the dashboard feature");
    }

    [Fact]
    public async Task Handle_ShouldCountHabitStreakRisk()
    {
        var goalId = Guid.NewGuid();
        var habits = new List<Habit>
        {
            new()
            {
                Id = Guid.NewGuid(), UserId = UserId, GoalId = goalId,
                Title = "Meditate", Frequency = HabitFrequency.Daily,
                CurrentStreak = 5, MinimumViableDose = "5 min",
                TrackingMethod = HabitTrackingMethod.Streak,
                Logs = new List<HabitLog>() // not logged today → at risk
            },
            new()
            {
                Id = Guid.NewGuid(), UserId = UserId, GoalId = goalId,
                Title = "Read", Frequency = HabitFrequency.Daily,
                CurrentStreak = 3, MinimumViableDose = "10 pages",
                TrackingMethod = HabitTrackingMethod.Streak,
                Logs = new List<HabitLog>
                {
                    new() { Id = Guid.NewGuid(), LoggedDate = Today } // logged today → safe
                }
            },
            new()
            {
                Id = Guid.NewGuid(), UserId = UserId, GoalId = goalId,
                Title = "Walk", Frequency = HabitFrequency.Daily,
                CurrentStreak = 0, MinimumViableDose = "15 min",
                TrackingMethod = HabitTrackingMethod.Streak,
                Logs = new List<HabitLog>() // not logged but streak = 0 → no risk
            },
        };

        _uow.Habits.GetByUserAndYearAsync(UserId, Year, Arg.Any<CancellationToken>())
            .Returns(habits);

        var result = await _handler.Handle(new GetDashboardQuery(), CancellationToken.None);

        result.HabitStreakRiskCount.ShouldBe(1); // only "Meditate" (streak > 0 and not logged)
        result.TodaysHabits.Count.ShouldBe(3);
    }
}
