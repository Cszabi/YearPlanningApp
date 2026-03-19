using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Goals;

public class UpdateGoalStatusCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly UpdateGoalStatusCommandHandler _handler;

    public UpdateGoalStatusCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new UpdateGoalStatusCommandHandler(_uow, _currentUser);
    }

    private Goal BuildGoal() => new()
    {
        Id = Guid.NewGuid(),
        UserId = _userId,
        Year = 2026,
        Title = "Goal",
        GoalType = GoalType.Project,
        Status = GoalStatus.Active,
        LifeArea = LifeArea.CareerWork,
        EnergyLevel = EnergyLevel.Deep,
        AlignedValueNames = "[]",
        Milestones = new List<Milestone>()
    };

    [Fact]
    public async Task Handle_ShouldUpdateStatus_WhenGoalExists()
    {
        var goal = BuildGoal();
        _uow.Goals.GetByIdAsync(goal.Id, Arg.Any<CancellationToken>()).Returns(goal);

        var result = await _handler.Handle(
            new UpdateGoalStatusCommand(goal.Id, 2026, GoalStatus.Paused),
            CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Status.ShouldBe(GoalStatus.Paused.ToString());
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenGoalDoesNotExist()
    {
        _uow.Goals.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Goal?)null);

        var result = await _handler.Handle(
            new UpdateGoalStatusCommand(Guid.NewGuid(), 2026, GoalStatus.Active),
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
            new UpdateGoalStatusCommand(goal.Id, 2026, GoalStatus.Achieved),
            CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }
}
