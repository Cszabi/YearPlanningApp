using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Goals;

public class CreateMilestoneCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly CreateMilestoneCommandHandler _handler;

    public CreateMilestoneCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new CreateMilestoneCommandHandler(_uow, _currentUser);
    }

    private Goal BuildGoal() => new()
    {
        Id = Guid.NewGuid(), UserId = _userId, Year = 2026, Title = "Goal",
        GoalType = GoalType.Project, Status = GoalStatus.Active, LifeArea = LifeArea.CareerWork,
        EnergyLevel = EnergyLevel.Deep, AlignedValueNames = "[]",
        Milestones = new List<Milestone>()
    };

    [Fact]
    public async Task Handle_ShouldCreateMilestone_WithIsCompleteFalse()
    {
        var goal = BuildGoal();
        _uow.Goals.GetByIdWithMilestonesAsync(goal.Id, Arg.Any<CancellationToken>()).Returns(goal);
        Milestone? saved = null;
        await _uow.Goals.AddMilestoneAsync(Arg.Do<Milestone>(m => saved = m), Arg.Any<CancellationToken>());

        var result = await _handler.Handle(
            new CreateMilestoneCommand(goal.Id, 2026, "Phase 1", null, 1),
            CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Title.ShouldBe("Phase 1");
        result.AsT0.IsComplete.ShouldBeFalse();
        saved.ShouldNotBeNull();
    }

    [Fact]
    public async Task Handle_ShouldSetTargetDateAsUtc_WhenProvided()
    {
        var goal = BuildGoal();
        _uow.Goals.GetByIdWithMilestonesAsync(goal.Id, Arg.Any<CancellationToken>()).Returns(goal);
        Milestone? saved = null;
        await _uow.Goals.AddMilestoneAsync(Arg.Do<Milestone>(m => saved = m), Arg.Any<CancellationToken>());

        var targetDate = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Unspecified);
        await _handler.Handle(
            new CreateMilestoneCommand(goal.Id, 2026, "Phase 1", targetDate, 1),
            CancellationToken.None);

        saved!.TargetDate!.Value.Kind.ShouldBe(DateTimeKind.Utc);
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenGoalDoesNotExist()
    {
        _uow.Goals.GetByIdWithMilestonesAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Goal?)null);

        var result = await _handler.Handle(
            new CreateMilestoneCommand(Guid.NewGuid(), 2026, "Phase 1", null, 1),
            CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }
}
