using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Goals;

public class GetHabitsQueryHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly GetHabitsQueryHandler _handler;

    public GetHabitsQueryHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new GetHabitsQueryHandler(_uow, _currentUser);
    }

    private Habit BuildHabit() => new()
    {
        Id = Guid.NewGuid(), UserId = _userId, GoalId = Guid.NewGuid(),
        Title = "Morning run", Frequency = HabitFrequency.Daily,
        MinimumViableDose = "5 min", TrackingMethod = HabitTrackingMethod.YesNo,
        CurrentStreak = 3, LongestStreak = 10, Logs = new List<HabitLog>()
    };

    [Fact]
    public async Task Handle_ShouldReturnHabits_ForUserAndYear()
    {
        var habits = new[] { BuildHabit(), BuildHabit() };
        _uow.Habits.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(habits);

        var result = await _handler.Handle(new GetHabitsQuery(2026), CancellationToken.None);

        result.Count().ShouldBe(2);
    }

    [Fact]
    public async Task Handle_ShouldReturnEmptyList_WhenNoHabitsExist()
    {
        _uow.Habits.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns(Array.Empty<Habit>());

        var result = await _handler.Handle(new GetHabitsQuery(2026), CancellationToken.None);

        result.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_ShouldMapStreaksCorrectly()
    {
        var habit = BuildHabit();
        habit.CurrentStreak = 7;
        habit.LongestStreak = 30;
        _uow.Habits.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns(new[] { habit });

        var result = await _handler.Handle(new GetHabitsQuery(2026), CancellationToken.None);

        var dto = result.Single();
        dto.CurrentStreak.ShouldBe(7);
        dto.LongestStreak.ShouldBe(30);
    }
}
