using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.FlowSessions;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.FlowSessions;

public class GetActiveFlowSessionQueryHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly GetActiveFlowSessionQueryHandler _handler;

    public GetActiveFlowSessionQueryHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new GetActiveFlowSessionQueryHandler(_uow, _currentUser);
    }

    [Fact]
    public async Task Handle_ShouldReturnNull_WhenNoActiveSession()
    {
        _uow.FlowSessions.GetActiveSessionAsync(_userId, Arg.Any<CancellationToken>()).Returns((FlowSession?)null);

        var result = await _handler.Handle(new GetActiveFlowSessionQuery(), CancellationToken.None);

        result.ShouldBeNull();
    }

    [Fact]
    public async Task Handle_ShouldReturnSessionDto_WhenActiveSessionExists()
    {
        var session = new FlowSession
        {
            Id = Guid.NewGuid(), UserId = _userId, GoalId = Guid.NewGuid(),
            PlannedMinutes = 90, StartedAt = DateTime.UtcNow,
            AmbientSound = AmbientSoundMode.BrownNoise, EnergyLevel = EnergyLevel.Deep,
            SessionIntention = "Write tests"
        };
        _uow.FlowSessions.GetActiveSessionAsync(_userId, Arg.Any<CancellationToken>()).Returns(session);

        var result = await _handler.Handle(new GetActiveFlowSessionQuery(), CancellationToken.None);

        result.ShouldNotBeNull();
        result!.SessionIntention.ShouldBe("Write tests");
        result.PlannedMinutes.ShouldBe(90);
    }
}
