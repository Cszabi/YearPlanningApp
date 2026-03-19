using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.FlowSessions;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.FlowSessions;

public class GetFlowSessionsQueryHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly GetFlowSessionsQueryHandler _handler;

    public GetFlowSessionsQueryHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new GetFlowSessionsQueryHandler(_uow, _currentUser);
    }

    private FlowSession BuildSession() => new()
    {
        Id = Guid.NewGuid(), UserId = _userId, GoalId = Guid.NewGuid(),
        PlannedMinutes = 60, StartedAt = new DateTime(2026, 3, 1, 9, 0, 0, DateTimeKind.Utc),
        AmbientSound = AmbientSoundMode.None, EnergyLevel = EnergyLevel.Deep
    };

    [Fact]
    public async Task Handle_ShouldReturnSessions_ForYear()
    {
        var sessions = new[] { BuildSession(), BuildSession() };
        _uow.FlowSessions.GetSessionsByDateRangeAsync(
            _userId,
            Arg.Is<DateTime>(d => d.Year == 2026 && d.Month == 1 && d.Day == 1),
            Arg.Any<DateTime>(),
            Arg.Any<CancellationToken>())
            .Returns(sessions);

        var result = await _handler.Handle(new GetFlowSessionsQuery(2026), CancellationToken.None);

        result.Count().ShouldBe(2);
    }

    [Fact]
    public async Task Handle_ShouldReturnEmptyList_WhenNoSessionsInYear()
    {
        _uow.FlowSessions.GetSessionsByDateRangeAsync(
            _userId, Arg.Any<DateTime>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns(Array.Empty<FlowSession>());

        var result = await _handler.Handle(new GetFlowSessionsQuery(2026), CancellationToken.None);

        result.ShouldBeEmpty();
    }
}
