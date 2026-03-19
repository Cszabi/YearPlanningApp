using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Goals;

public class UpdateTaskCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly UpdateTaskCommandHandler _handler;

    public UpdateTaskCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new UpdateTaskCommandHandler(_uow, _currentUser);
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
            Title = "Original Task", Status = TaskItemStatus.NotStarted,
            EnergyLevel = EnergyLevel.Deep, IsNextAction = false
        };
        return (goal, task);
    }

    [Fact]
    public async Task Handle_ShouldUpdateTitle_WhenProvided()
    {
        var (goal, task) = BuildGoalAndTask();
        _uow.Tasks.GetByIdAsync(task.Id, Arg.Any<CancellationToken>()).Returns(task);
        _uow.Goals.GetByIdAsync(task.GoalId, Arg.Any<CancellationToken>()).Returns(goal);

        var result = await _handler.Handle(
            new UpdateTaskCommand(task.Id, "New Title", null, null, null),
            CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Title.ShouldBe("New Title");
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenTaskDoesNotExist()
    {
        _uow.Tasks.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((TaskItem?)null);

        var result = await _handler.Handle(
            new UpdateTaskCommand(Guid.NewGuid(), "Title", null, null, null),
            CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenGoalBelongsToDifferentUser()
    {
        var (goal, task) = BuildGoalAndTask();
        goal.UserId = Guid.NewGuid(); // different user
        _uow.Tasks.GetByIdAsync(task.Id, Arg.Any<CancellationToken>()).Returns(task);
        _uow.Goals.GetByIdAsync(task.GoalId, Arg.Any<CancellationToken>()).Returns(goal);

        var result = await _handler.Handle(
            new UpdateTaskCommand(task.Id, "Title", null, null, null),
            CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldParseStatusString_WhenProvided()
    {
        var (goal, task) = BuildGoalAndTask();
        _uow.Tasks.GetByIdAsync(task.Id, Arg.Any<CancellationToken>()).Returns(task);
        _uow.Goals.GetByIdAsync(task.GoalId, Arg.Any<CancellationToken>()).Returns(goal);

        var result = await _handler.Handle(
            new UpdateTaskCommand(task.Id, null, null, null, "Done"),
            CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Status.ShouldBe("Done");
    }
}
