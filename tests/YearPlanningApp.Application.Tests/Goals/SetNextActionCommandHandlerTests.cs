using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Goals;

public class SetNextActionCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly SetNextActionCommandHandler _handler;

    public SetNextActionCommandHandlerTests()
    {
        _handler = new SetNextActionCommandHandler(_uow);
    }

    private static TaskItem BuildTask(Guid goalId, bool isNextAction = false) => new()
    {
        Id = Guid.NewGuid(),
        GoalId = goalId,
        MilestoneId = Guid.NewGuid(),
        Title = "My task",
        Status = TaskItemStatus.NotStarted,
        EnergyLevel = EnergyLevel.Deep,
        IsNextAction = isNextAction
    };

    [Fact]
    public async Task Handle_ShouldSetIsNextAction_AndClearOthers_WhenSettingToTrue()
    {
        var goalId = Guid.NewGuid();
        var task = BuildTask(goalId);
        _uow.Tasks.GetByIdAsync(task.Id, Arg.Any<CancellationToken>()).Returns(task);

        var result = await _handler.Handle(new SetNextActionCommand(task.Id, true), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.IsNextAction.ShouldBeTrue();
        await _uow.Tasks.Received(1).ClearNextActionForGoalAsync(goalId, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldNotClearOthers_WhenSettingToFalse()
    {
        var goalId = Guid.NewGuid();
        var task = BuildTask(goalId, isNextAction: true);
        _uow.Tasks.GetByIdAsync(task.Id, Arg.Any<CancellationToken>()).Returns(task);

        var result = await _handler.Handle(new SetNextActionCommand(task.Id, false), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.IsNextAction.ShouldBeFalse();
        await _uow.Tasks.DidNotReceive().ClearNextActionForGoalAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenTaskDoesNotExist()
    {
        _uow.Tasks.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((TaskItem?)null);

        var result = await _handler.Handle(new SetNextActionCommand(Guid.NewGuid(), true), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }
}
