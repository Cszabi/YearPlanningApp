using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Goals;

public class DeleteHabitCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly IHabitRepository _habitRepo = Substitute.For<IHabitRepository>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly DeleteHabitCommandHandler _handler;

    public DeleteHabitCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _uow.Habits.Returns(_habitRepo);
        _handler = new DeleteHabitCommandHandler(_uow, _currentUser);
    }

    private Habit BuildHabit() => new()
    {
        Id = Guid.NewGuid(),
        UserId = _userId,
        GoalId = Guid.NewGuid(),
        Title = "Morning run",
        Frequency = HabitFrequency.Daily,
        MinimumViableDose = "5 minutes",
        TrackingMethod = HabitTrackingMethod.Streak,
        Logs = new List<HabitLog>(),
    };

    [Fact]
    public async Task Handle_ShouldSoftDeleteHabit_AndReturnSuccess()
    {
        var habit = BuildHabit();
        _habitRepo.GetByIdAsync(habit.Id, Arg.Any<CancellationToken>()).Returns(habit);

        var result = await _handler.Handle(new DeleteHabitCommand(habit.Id), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        _habitRepo.Received(1).Remove(habit);
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFound_WhenHabitDoesNotExist()
    {
        _habitRepo.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Habit?)null);

        var result = await _handler.Handle(new DeleteHabitCommand(Guid.NewGuid()), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
        _habitRepo.DidNotReceive().Remove(Arg.Any<Habit>());
        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFound_WhenHabitBelongsToDifferentUser()
    {
        var habit = BuildHabit();
        habit.UserId = Guid.NewGuid(); // different owner
        _habitRepo.GetByIdAsync(habit.Id, Arg.Any<CancellationToken>()).Returns(habit);

        var result = await _handler.Handle(new DeleteHabitCommand(habit.Id), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
        _habitRepo.DidNotReceive().Remove(Arg.Any<Habit>());
        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldNotSave_WhenHabitNotFound()
    {
        _habitRepo.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Habit?)null);

        await _handler.Handle(new DeleteHabitCommand(Guid.NewGuid()), CancellationToken.None);

        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
