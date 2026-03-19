using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Goals;

public class DeleteTaskCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly DeleteTaskCommandHandler _handler;

    public DeleteTaskCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new DeleteTaskCommandHandler(_uow, _currentUser);
    }

    private (Goal goal, TaskItem task) BuildGoalAndTask()
    {
        var goal = new Goal
        {
            Id = Guid.NewGuid(), UserId = _userId, Year = 2026, Title = "Goal",
            GoalType = GoalType.Project, Status = GoalStatus.Active, LifeArea = LifeArea.CareerWork,
            EnergyLevel = EnergyLevel.Deep, AlignedValueNames = "[]", Milestones = new List<Milestone>()
        };
        var task = new TaskItem
        {
            Id = Guid.NewGuid(), GoalId = goal.Id, MilestoneId = Guid.NewGuid(),
            Title = "Task", Status = TaskItemStatus.NotStarted, EnergyLevel = EnergyLevel.Deep
        };
        return (goal, task);
    }

    [Fact]
    public async Task Handle_ShouldDeleteTask_WhenOwnershipIsValid()
    {
        var (goal, task) = BuildGoalAndTask();
        _uow.Tasks.GetByIdAsync(task.Id, Arg.Any<CancellationToken>()).Returns(task);
        _uow.Goals.GetByIdAsync(task.GoalId, Arg.Any<CancellationToken>()).Returns(goal);

        var result = await _handler.Handle(new DeleteTaskCommand(task.Id), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        _uow.Tasks.Received(1).Remove(task);
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenTaskDoesNotExist()
    {
        _uow.Tasks.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((TaskItem?)null);

        var result = await _handler.Handle(new DeleteTaskCommand(Guid.NewGuid()), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenGoalBelongsToDifferentUser()
    {
        var (goal, task) = BuildGoalAndTask();
        goal.UserId = Guid.NewGuid();
        _uow.Tasks.GetByIdAsync(task.Id, Arg.Any<CancellationToken>()).Returns(task);
        _uow.Goals.GetByIdAsync(task.GoalId, Arg.Any<CancellationToken>()).Returns(goal);

        var result = await _handler.Handle(new DeleteTaskCommand(task.Id), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
        _uow.Tasks.DidNotReceive().Remove(Arg.Any<TaskItem>());
    }
}
