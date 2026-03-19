using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Goals;

public class SaveSmartGoalCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly SaveSmartGoalCommandHandler _handler;

    public SaveSmartGoalCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new SaveSmartGoalCommandHandler(_uow, _currentUser);
    }

    private Goal BuildGoal() => new()
    {
        Id = Guid.NewGuid(),
        UserId = _userId,
        Year = 2026,
        Title = "Goal",
        GoalType = GoalType.Project,
        Status = GoalStatus.Active,
        LifeArea = LifeArea.CareerWork,
        EnergyLevel = EnergyLevel.Deep,
        AlignedValueNames = "[]",
        Milestones = new List<Milestone>(),
        SmartGoal = null
    };

    private SaveSmartGoalCommand BuildCommand(Guid goalId) => new(
        goalId, 2026,
        "Be specific", "Measure it", "Achievable", "Relevant",
        DateTime.UtcNow.AddMonths(6));

    [Fact]
    public async Task Handle_ShouldCreateSmartGoal_WhenNoneExists()
    {
        var goal = BuildGoal();
        _uow.Goals.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns(new[] { goal });

        var result = await _handler.Handle(BuildCommand(goal.Id), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.SmartGoal.ShouldNotBeNull();
        result.AsT0.SmartGoal!.Specific.ShouldBe("Be specific");
    }

    [Fact]
    public async Task Handle_ShouldUpdateSmartGoal_WhenOneAlreadyExists()
    {
        var goal = BuildGoal();
        goal.SmartGoal = new SmartGoal
        {
            GoalId = goal.Id,
            Specific = "Old specific",
            Measurable = "Old measurable",
            Achievable = "Old achievable",
            Relevant = "Old relevant",
            TimeBound = DateTime.UtcNow.AddMonths(3)
        };
        _uow.Goals.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns(new[] { goal });

        var result = await _handler.Handle(BuildCommand(goal.Id), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.SmartGoal!.Specific.ShouldBe("Be specific");
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
