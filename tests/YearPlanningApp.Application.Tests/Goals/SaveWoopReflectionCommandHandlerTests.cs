using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Goals;

public class SaveWoopReflectionCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly SaveWoopReflectionCommandHandler _handler;

    public SaveWoopReflectionCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new SaveWoopReflectionCommandHandler(_uow, _currentUser);
    }

    private Goal BuildGoal() => new()
    {
        Id = Guid.NewGuid(), UserId = _userId, Year = 2026, Title = "Goal",
        GoalType = GoalType.Project, Status = GoalStatus.Active, LifeArea = LifeArea.CareerWork,
        EnergyLevel = EnergyLevel.Deep, AlignedValueNames = "[]",
        Milestones = new List<Milestone>(), WoopReflection = null
    };

    private SaveWoopReflectionCommand BuildCommand(Guid goalId) =>
        new(goalId, 2026, "My wish", "Best outcome", "Main obstacle", "My plan");

    [Fact]
    public async Task Handle_ShouldCreateWoopReflection_WhenNoneExists()
    {
        var goal = BuildGoal();
        _uow.Goals.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns(new[] { goal });

        var result = await _handler.Handle(BuildCommand(goal.Id), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.WoopReflection.ShouldNotBeNull();
        result.AsT0.WoopReflection!.Wish.ShouldBe("My wish");
        result.AsT0.WoopReflection!.Plan.ShouldBe("My plan");
    }

    [Fact]
    public async Task Handle_ShouldUpdateWoopReflection_WhenOneAlreadyExists()
    {
        var goal = BuildGoal();
        goal.WoopReflection = new WoopReflection
        {
            GoalId = goal.Id, Wish = "Old wish", Outcome = "Old outcome",
            Obstacle = "Old obstacle", Plan = "Old plan"
        };
        _uow.Goals.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns(new[] { goal });

        var result = await _handler.Handle(BuildCommand(goal.Id), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.WoopReflection!.Wish.ShouldBe("My wish");
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenGoalDoesNotExist()
    {
        _uow.Goals.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns(Array.Empty<Goal>());

        var result = await _handler.Handle(BuildCommand(Guid.NewGuid()), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }
}
