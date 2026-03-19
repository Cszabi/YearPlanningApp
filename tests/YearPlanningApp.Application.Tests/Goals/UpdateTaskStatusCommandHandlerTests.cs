using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Goals;

public class UpdateTaskStatusCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly UpdateTaskStatusCommandHandler _handler;

    public UpdateTaskStatusCommandHandlerTests()
    {
        _currentUser.UserId.Returns(Guid.NewGuid());
        _handler = new UpdateTaskStatusCommandHandler(_uow, _currentUser);
    }

    private static TaskItem BuildTask() => new()
    {
        Id = Guid.NewGuid(), GoalId = Guid.NewGuid(), MilestoneId = Guid.NewGuid(),
        Title = "Task", Status = TaskItemStatus.NotStarted, EnergyLevel = EnergyLevel.Deep
    };

    [Fact]
    public async Task Handle_ShouldUpdateStatus_WhenTaskExists()
    {
        var task = BuildTask();
        _uow.Tasks.GetByIdAsync(task.Id, Arg.Any<CancellationToken>()).Returns(task);

        var result = await _handler.Handle(
            new UpdateTaskStatusCommand(task.Id, TaskItemStatus.Done),
            CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Status.ShouldBe("Done");
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenTaskDoesNotExist()
    {
        _uow.Tasks.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((TaskItem?)null);

        var result = await _handler.Handle(
            new UpdateTaskStatusCommand(Guid.NewGuid(), TaskItemStatus.Done),
            CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldTransitionStatus_FromInProgressToDone()
    {
        var task = BuildTask();
        task.Status = TaskItemStatus.InProgress;
        _uow.Tasks.GetByIdAsync(task.Id, Arg.Any<CancellationToken>()).Returns(task);

        var result = await _handler.Handle(
            new UpdateTaskStatusCommand(task.Id, TaskItemStatus.Done),
            CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Status.ShouldBe("Done");
    }
}
