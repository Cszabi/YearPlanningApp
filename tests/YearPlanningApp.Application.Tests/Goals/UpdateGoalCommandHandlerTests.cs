using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Goals;

public class UpdateGoalCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly UpdateGoalCommandHandler _handler;

    public UpdateGoalCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new UpdateGoalCommandHandler(_uow, _currentUser);
    }

    private Goal BuildGoal(int year = 2026) => new()
    {
        Id = Guid.NewGuid(),
        UserId = _userId,
        Year = year,
        Title = "Original Title",
        GoalType = GoalType.Project,
        Status = GoalStatus.Active,
        LifeArea = LifeArea.CareerWork,
        EnergyLevel = EnergyLevel.Deep,
        AlignedValueNames = "[]",
        Milestones = new List<Milestone>()
    };

    [Fact]
    public async Task Handle_ShouldUpdateTitle_WhenGoalExists()
    {
        var goal = BuildGoal();
        _uow.Goals.GetByIdAsync(goal.Id, Arg.Any<CancellationToken>()).Returns(goal);

        var result = await _handler.Handle(
            new UpdateGoalCommand(goal.Id, 2026, "New Title", null, null, null, null, null),
            CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Title.ShouldBe("New Title");
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenGoalBelongsToDifferentUser()
    {
        var goal = BuildGoal();
        goal.UserId = Guid.NewGuid(); // different user
        _uow.Goals.GetByIdAsync(goal.Id, Arg.Any<CancellationToken>()).Returns(goal);

        var result = await _handler.Handle(
            new UpdateGoalCommand(goal.Id, 2026, "New Title", null, null, null, null, null),
            CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenYearDoesNotMatch()
    {
        var goal = BuildGoal(year: 2025);
        _uow.Goals.GetByIdAsync(goal.Id, Arg.Any<CancellationToken>()).Returns(goal);

        var result = await _handler.Handle(
            new UpdateGoalCommand(goal.Id, 2026, "New Title", null, null, null, null, null),
            CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldOnlyUpdateProvidedFields()
    {
        var goal = BuildGoal();
        _uow.Goals.GetByIdAsync(goal.Id, Arg.Any<CancellationToken>()).Returns(goal);

        var result = await _handler.Handle(
            new UpdateGoalCommand(goal.Id, 2026, null, "New why", null, null, null, null),
            CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Title.ShouldBe("Original Title"); // unchanged
        result.AsT0.WhyItMatters.ShouldBe("New why");
    }
}
