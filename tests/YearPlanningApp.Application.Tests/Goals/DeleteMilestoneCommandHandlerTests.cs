using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Goals;

public class DeleteMilestoneCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly DeleteMilestoneCommandHandler _handler;

    public DeleteMilestoneCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new DeleteMilestoneCommandHandler(_uow, _currentUser);
    }

    private Milestone BuildMilestone(Guid? overrideUserId = null)
    {
        var goal = new Goal
        {
            Id = Guid.NewGuid(), UserId = overrideUserId ?? _userId, Year = 2026, Title = "Goal",
            GoalType = GoalType.Project, Status = GoalStatus.Active, LifeArea = LifeArea.CareerWork,
            EnergyLevel = EnergyLevel.Deep, AlignedValueNames = "[]", Milestones = new List<Milestone>()
        };
        return new Milestone
        {
            Id = Guid.NewGuid(), GoalId = goal.Id, Goal = goal,
            Title = "Phase 1", IsComplete = false, OrderIndex = 1, Tasks = new List<TaskItem>()
        };
    }

    [Fact]
    public async Task Handle_ShouldDeleteMilestone_WhenOwnershipIsValid()
    {
        var milestone = BuildMilestone();
        _uow.Goals.GetMilestoneWithGoalAsync(milestone.Id, Arg.Any<CancellationToken>()).Returns(milestone);

        var result = await _handler.Handle(new DeleteMilestoneCommand(milestone.Id), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        _uow.Goals.Received(1).RemoveMilestone(milestone);
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenMilestoneDoesNotExist()
    {
        _uow.Goals.GetMilestoneWithGoalAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Milestone?)null);

        var result = await _handler.Handle(new DeleteMilestoneCommand(Guid.NewGuid()), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenGoalBelongsToDifferentUser()
    {
        var milestone = BuildMilestone(overrideUserId: Guid.NewGuid());
        _uow.Goals.GetMilestoneWithGoalAsync(milestone.Id, Arg.Any<CancellationToken>()).Returns(milestone);

        var result = await _handler.Handle(new DeleteMilestoneCommand(milestone.Id), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
        _uow.Goals.DidNotReceive().RemoveMilestone(Arg.Any<Milestone>());
    }
}
