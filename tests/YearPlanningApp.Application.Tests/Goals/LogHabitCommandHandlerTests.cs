using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Goals;

public class LogHabitCommandHandlerTests
{
    private readonly IUnitOfWork _uow;
    private readonly IHabitRepository _habitRepo;
    private readonly ICurrentUserService _currentUser;
    private readonly LogHabitCommandHandler _handler;

    private static readonly Guid UserId = Guid.NewGuid();

    public LogHabitCommandHandlerTests()
    {
        _uow = Substitute.For<IUnitOfWork>();
        _habitRepo = Substitute.For<IHabitRepository>();
        _uow.Habits.Returns(_habitRepo);

        _currentUser = Substitute.For<ICurrentUserService>();
        _currentUser.UserId.Returns(UserId);

        _handler = new LogHabitCommandHandler(_uow, _currentUser);
    }

    private static Habit BuildHabit(int currentStreak = 0, int longestStreak = 0) => new()
    {
        Id = Guid.NewGuid(),
        UserId = UserId,
        GoalId = Guid.NewGuid(),
        Title = "Morning run",
        Frequency = HabitFrequency.Daily,
        MinimumViableDose = "10 minutes",
        TrackingMethod = HabitTrackingMethod.Streak,
        CurrentStreak = currentStreak,
        LongestStreak = longestStreak,
    };

    [Fact]
    public async Task Handle_ShouldStartStreak_WhenNoRecentLog()
    {
        var habit = BuildHabit(currentStreak: 0);
        _habitRepo.GetByIdAsync(habit.Id, Arg.Any<CancellationToken>()).Returns(habit);
        _habitRepo.GetLogsByHabitAndDateRangeAsync(habit.Id, Arg.Any<DateTime>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns([]);

        var result = await _handler.Handle(new LogHabitCommand(habit.Id, null, null), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.CurrentStreak.ShouldBe(1);
        result.AsT0.LongestStreak.ShouldBe(1);
    }

    [Fact]
    public async Task Handle_ShouldIncrementStreak_WhenLoggedYesterday()
    {
        var habit = BuildHabit(currentStreak: 5, longestStreak: 7);
        _habitRepo.GetByIdAsync(habit.Id, Arg.Any<CancellationToken>()).Returns(habit);

        var yesterday = new HabitLog { HabitId = habit.Id, LoggedDate = DateTime.UtcNow.Date.AddDays(-1) };
        _habitRepo.GetLogsByHabitAndDateRangeAsync(habit.Id, Arg.Any<DateTime>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns([yesterday]);

        var result = await _handler.Handle(new LogHabitCommand(habit.Id, null, null), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.CurrentStreak.ShouldBe(6);
        result.AsT0.LongestStreak.ShouldBe(7); // not exceeded
    }

    [Fact]
    public async Task Handle_ShouldUpdateLongestStreak_WhenCurrentExceedsPrevious()
    {
        var habit = BuildHabit(currentStreak: 7, longestStreak: 7);
        _habitRepo.GetByIdAsync(habit.Id, Arg.Any<CancellationToken>()).Returns(habit);

        var yesterday = new HabitLog { HabitId = habit.Id, LoggedDate = DateTime.UtcNow.Date.AddDays(-1) };
        _habitRepo.GetLogsByHabitAndDateRangeAsync(habit.Id, Arg.Any<DateTime>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns([yesterday]);

        var result = await _handler.Handle(new LogHabitCommand(habit.Id, null, null), CancellationToken.None);

        result.AsT0.CurrentStreak.ShouldBe(8);
        result.AsT0.LongestStreak.ShouldBe(8);
    }

    [Fact]
    public async Task Handle_ShouldResetStreak_WhenMissedDay()
    {
        var habit = BuildHabit(currentStreak: 10, longestStreak: 10);
        _habitRepo.GetByIdAsync(habit.Id, Arg.Any<CancellationToken>()).Returns(habit);

        // Last log was 3 days ago — streak broken
        var oldLog = new HabitLog { HabitId = habit.Id, LoggedDate = DateTime.UtcNow.Date.AddDays(-3) };
        _habitRepo.GetLogsByHabitAndDateRangeAsync(habit.Id, Arg.Any<DateTime>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns([oldLog]);

        var result = await _handler.Handle(new LogHabitCommand(habit.Id, null, null), CancellationToken.None);

        result.AsT0.CurrentStreak.ShouldBe(1); // reset
        result.AsT0.LongestStreak.ShouldBe(10); // preserved
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFound_WhenHabitDoesNotExist()
    {
        _habitRepo.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Habit?)null);

        var result = await _handler.Handle(new LogHabitCommand(Guid.NewGuid(), null, null), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }
}
