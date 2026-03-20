using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Goals;

public class GetGoalByIdQueryHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly GetGoalByIdQueryHandler _handler;

    public GetGoalByIdQueryHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new GetGoalByIdQueryHandler(_uow, _currentUser);
    }

    private Goal BuildGoal() => new()
    {
        Id = Guid.NewGuid(), UserId = _userId, Year = 2026, Title = "My Goal",
        GoalType = GoalType.Project, Status = GoalStatus.Active, LifeArea = LifeArea.CareerWork,
        EnergyLevel = EnergyLevel.Deep, AlignedValueNames = "[]",
        Milestones = new List<Milestone>()
    };

    [Fact]
    public async Task Handle_ShouldReturnGoalWithProgressPercent_WhenGoalExists()
    {
        var goal = BuildGoal();
        goal.ProgressPercent = 75;
        _uow.Goals.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns(new[] { goal });

        var result = await _handler.Handle(new GetGoalByIdQuery(goal.Id, 2026), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Title.ShouldBe("My Goal");
        result.AsT0.ProgressPercent.ShouldBe(75);
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenGoalDoesNotExist()
    {
        _uow.Goals.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns(Array.Empty<Goal>());

        var result = await _handler.Handle(new GetGoalByIdQuery(Guid.NewGuid(), 2026), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }
}
