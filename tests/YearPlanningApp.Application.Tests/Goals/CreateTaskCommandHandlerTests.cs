using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Goals;

public class CreateTaskCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly CreateTaskCommandHandler _handler;

    public CreateTaskCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new CreateTaskCommandHandler(_uow, _currentUser);
    }

    private (Goal goal, Milestone milestone) BuildGoalWithMilestone()
    {
        var milestone = new Milestone { Id = Guid.NewGuid(), Title = "M1", IsComplete = false, OrderIndex = 1, Tasks = new List<TaskItem>() };
        var goal = new Goal
        {
            Id = Guid.NewGuid(), UserId = _userId, Year = 2026, Title = "Goal",
            GoalType = GoalType.Project, Status = GoalStatus.Active, LifeArea = LifeArea.CareerWork,
            EnergyLevel = EnergyLevel.Deep, AlignedValueNames = "[]",
            Milestones = new List<Milestone> { milestone }
        };
        milestone.GoalId = goal.Id;
        return (goal, milestone);
    }

    [Fact]
    public async Task Handle_ShouldCreateTask_WithNotStartedStatus()
    {
        var (goal, milestone) = BuildGoalWithMilestone();
        _uow.Goals.GetByIdAsync(goal.Id, Arg.Any<CancellationToken>()).Returns(goal);
        _uow.Goals.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(new[] { goal });

        var result = await _handler.Handle(
            new CreateTaskCommand(goal.Id, milestone.Id, 2026, "Write tests", EnergyLevel.Deep, 60, null, false),
            CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Title.ShouldBe("Write tests");
        result.AsT0.Status.ShouldBe(TaskItemStatus.NotStarted.ToString());
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenGoalDoesNotExist()
    {
        _uow.Goals.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Goal?)null);

        var result = await _handler.Handle(
            new CreateTaskCommand(Guid.NewGuid(), Guid.NewGuid(), 2026, "Task", EnergyLevel.Deep, null, null, false),
            CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenMilestoneDoesNotBelongToGoal()
    {
        var (goal, _) = BuildGoalWithMilestone();
        _uow.Goals.GetByIdAsync(goal.Id, Arg.Any<CancellationToken>()).Returns(goal);
        _uow.Goals.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(new[] { goal });

        var result = await _handler.Handle(
            new CreateTaskCommand(goal.Id, Guid.NewGuid() /* wrong milestone */, 2026, "Task", EnergyLevel.Deep, null, null, false),
            CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldSetDueDateAsUtc_WhenProvided()
    {
        var (goal, milestone) = BuildGoalWithMilestone();
        _uow.Goals.GetByIdAsync(goal.Id, Arg.Any<CancellationToken>()).Returns(goal);
        _uow.Goals.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(new[] { goal });
        TaskItem? saved = null;
        await _uow.Tasks.AddAsync(Arg.Do<TaskItem>(t => saved = t), Arg.Any<CancellationToken>());

        var due = new DateTime(2026, 12, 31, 0, 0, 0, DateTimeKind.Unspecified);
        await _handler.Handle(
            new CreateTaskCommand(goal.Id, milestone.Id, 2026, "Task", EnergyLevel.Deep, null, due, false),
            CancellationToken.None);

        saved!.DueDate!.Value.Kind.ShouldBe(DateTimeKind.Utc);
    }
}
