using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Goals;

public class GetGoalsQueryHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly GetGoalsQueryHandler _handler;

    public GetGoalsQueryHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new GetGoalsQueryHandler(_uow, _currentUser);
    }

    private Goal BuildGoal(GoalStatus status = GoalStatus.Active, LifeArea area = LifeArea.CareerWork) => new()
    {
        Id = Guid.NewGuid(), UserId = _userId, Year = 2026, Title = "Goal",
        GoalType = GoalType.Project, Status = status, LifeArea = area,
        EnergyLevel = EnergyLevel.Deep, AlignedValueNames = "[]",
        Milestones = new List<Milestone>()
    };

    [Fact]
    public async Task Handle_ShouldReturnAllGoals_WhenNoFilterApplied()
    {
        var goals = new[] { BuildGoal(), BuildGoal(GoalStatus.Paused), BuildGoal(GoalStatus.Achieved) };
        _uow.Goals.GetByUserYearAndFilterAsync(_userId, 2026, null, null, Arg.Any<CancellationToken>())
            .Returns(goals);

        var result = await _handler.Handle(new GetGoalsQuery(2026, null, null), CancellationToken.None);

        result.Count().ShouldBe(3);
    }

    [Fact]
    public async Task Handle_ShouldReturnEmptyList_WhenNoGoalsExist()
    {
        _uow.Goals.GetByUserYearAndFilterAsync(_userId, 2026, null, null, Arg.Any<CancellationToken>())
            .Returns(Array.Empty<Goal>());

        var result = await _handler.Handle(new GetGoalsQuery(2026, null, null), CancellationToken.None);

        result.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_ShouldPassFiltersToRepository()
    {
        _uow.Goals.GetByUserYearAndFilterAsync(
            _userId, 2026, LifeArea.HealthBody, GoalStatus.Active, Arg.Any<CancellationToken>())
            .Returns(Array.Empty<Goal>());

        await _handler.Handle(new GetGoalsQuery(2026, LifeArea.HealthBody, GoalStatus.Active), CancellationToken.None);

        await _uow.Goals.Received(1).GetByUserYearAndFilterAsync(
            _userId, 2026, LifeArea.HealthBody, GoalStatus.Active, Arg.Any<CancellationToken>());
    }
}
