using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Goals;

public class UpdateMilestoneCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly UpdateMilestoneCommandHandler _handler;

    public UpdateMilestoneCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new UpdateMilestoneCommandHandler(_uow, _currentUser);
    }

    private Milestone BuildMilestone()
    {
        var goal = new Goal
        {
            Id = Guid.NewGuid(), UserId = _userId, Year = 2026, Title = "Goal",
            GoalType = GoalType.Project, Status = GoalStatus.Active, LifeArea = LifeArea.CareerWork,
            EnergyLevel = EnergyLevel.Deep, AlignedValueNames = "[]", Milestones = new List<Milestone>()
        };
        var milestone = new Milestone
        {
            Id = Guid.NewGuid(), GoalId = goal.Id, Goal = goal,
            Title = "Phase 1", IsComplete = false, OrderIndex = 1,
            Tasks = new List<TaskItem>()
        };
        return milestone;
    }

    [Fact]
    public async Task Handle_ShouldUpdateTitle_WhenMilestoneExists()
    {
        var milestone = BuildMilestone();
        _uow.Goals.GetMilestoneWithGoalAsync(milestone.Id, Arg.Any<CancellationToken>()).Returns(milestone);

        var result = await _handler.Handle(
            new UpdateMilestoneCommand(milestone.Id, "Phase 2", null, null),
            CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Title.ShouldBe("Phase 2");
    }

    [Fact]
    public async Task Handle_ShouldMarkComplete_WhenIsCompleteIsTrue()
    {
        var milestone = BuildMilestone();
        _uow.Goals.GetMilestoneWithGoalAsync(milestone.Id, Arg.Any<CancellationToken>()).Returns(milestone);

        var result = await _handler.Handle(
            new UpdateMilestoneCommand(milestone.Id, null, null, true),
            CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.IsComplete.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenMilestoneDoesNotExist()
    {
        _uow.Goals.GetMilestoneWithGoalAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Milestone?)null);

        var result = await _handler.Handle(
            new UpdateMilestoneCommand(Guid.NewGuid(), "Title", null, null),
            CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenMilestoneBelongsToDifferentUser()
    {
        var milestone = BuildMilestone();
        milestone.Goal.UserId = Guid.NewGuid(); // different user
        _uow.Goals.GetMilestoneWithGoalAsync(milestone.Id, Arg.Any<CancellationToken>()).Returns(milestone);

        var result = await _handler.Handle(
            new UpdateMilestoneCommand(milestone.Id, "Title", null, null),
            CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }
}
