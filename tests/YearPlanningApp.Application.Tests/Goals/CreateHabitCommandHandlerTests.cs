using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Goals;

public class CreateHabitCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly CreateHabitCommandHandler _handler;

    public CreateHabitCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new CreateHabitCommandHandler(_uow, _currentUser);
    }

    private Goal BuildGoal() => new()
    {
        Id = Guid.NewGuid(), UserId = _userId, Year = 2026, Title = "Goal",
        GoalType = GoalType.Project, Status = GoalStatus.Active, LifeArea = LifeArea.CareerWork,
        EnergyLevel = EnergyLevel.Deep, AlignedValueNames = "[]",
        Milestones = new List<Milestone>()
    };

    [Fact]
    public async Task Handle_ShouldCreateHabit_WithZeroStreaks()
    {
        var goal = BuildGoal();
        _uow.Goals.GetByIdAsync(goal.Id, Arg.Any<CancellationToken>()).Returns(goal);
        Habit? savedHabit = null;
        await _uow.Habits.AddAsync(Arg.Do<Habit>(h => savedHabit = h), Arg.Any<CancellationToken>());

        var result = await _handler.Handle(
            new CreateHabitCommand(goal.Id, 2026, "Morning Run", HabitFrequency.Daily,
                "5 minutes", "30 minutes", "After coffee", "Celebrate!", HabitTrackingMethod.YesNo),
            CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Title.ShouldBe("Morning Run");
        result.AsT0.CurrentStreak.ShouldBe(0);
        result.AsT0.LongestStreak.ShouldBe(0);
        savedHabit.ShouldNotBeNull();
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenGoalDoesNotExist()
    {
        _uow.Goals.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Goal?)null);

        var result = await _handler.Handle(
            new CreateHabitCommand(Guid.NewGuid(), 2026, "Run", HabitFrequency.Daily,
                "5 min", null, null, null, HabitTrackingMethod.YesNo),
            CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenGoalBelongsToDifferentUser()
    {
        var goal = BuildGoal();
        goal.UserId = Guid.NewGuid();
        _uow.Goals.GetByIdAsync(goal.Id, Arg.Any<CancellationToken>()).Returns(goal);

        var result = await _handler.Handle(
            new CreateHabitCommand(goal.Id, 2026, "Run", HabitFrequency.Daily,
                "5 min", null, null, null, HabitTrackingMethod.YesNo),
            CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldSetOptionalFields_WhenProvided()
    {
        var goal = BuildGoal();
        _uow.Goals.GetByIdAsync(goal.Id, Arg.Any<CancellationToken>()).Returns(goal);

        var result = await _handler.Handle(
            new CreateHabitCommand(goal.Id, 2026, "Run", HabitFrequency.Weekly,
                "1 km", "5 km", "Morning alarm", "Coffee reward", HabitTrackingMethod.Duration),
            CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.IdealDose.ShouldBe("5 km");
        result.AsT0.Trigger.ShouldBe("Morning alarm");
        result.AsT0.CelebrationRitual.ShouldBe("Coffee reward");
    }
}
