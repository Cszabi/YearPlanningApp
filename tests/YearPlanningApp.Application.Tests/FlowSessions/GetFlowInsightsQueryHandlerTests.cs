using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.FlowSessions;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.FlowSessions;

public class GetFlowInsightsQueryHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly GetFlowInsightsQueryHandler _handler;

    public GetFlowInsightsQueryHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new GetFlowInsightsQueryHandler(_uow, _currentUser);
    }

    private FlowSession BuildSession(int hour = 9, int? actualMin = 60, int? qualityRating = 4) => new()
    {
        Id = Guid.NewGuid(), UserId = _userId,
        GoalId = Guid.NewGuid(), PlannedMinutes = 60, ActualMinutes = actualMin,
        StartedAt = DateTime.UtcNow.Date.AddHours(hour),
        AmbientSound = AmbientSoundMode.None, EnergyLevel = EnergyLevel.Deep,
        FlowQualityRating = qualityRating
    };

    [Fact]
    public async Task Handle_ShouldReturnInsights_WithCorrectSessionCount()
    {
        var sessions = new[] { BuildSession(), BuildSession(hour: 10) };
        _uow.FlowSessions.GetSessionsByDateRangeAsync(
            _userId, Arg.Any<DateTime>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns(sessions);

        var result = await _handler.Handle(new GetFlowInsightsQuery(), CancellationToken.None);

        result.WeekSessionCount.ShouldBe(2);
        result.WeekTotalMinutes.ShouldBe(120);
    }

    [Fact]
    public async Task Handle_ShouldReturnNullQuality_WhenNoRatings()
    {
        var sessions = new[] { BuildSession(qualityRating: null) };
        _uow.FlowSessions.GetSessionsByDateRangeAsync(
            _userId, Arg.Any<DateTime>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns(sessions);

        var result = await _handler.Handle(new GetFlowInsightsQuery(), CancellationToken.None);

        result.WeekAvgFlowQuality.ShouldBeNull();
    }

    [Fact]
    public async Task Handle_ShouldReturnBestHour_AsMostFrequentStartHour()
    {
        var sessions = new[]
        {
            BuildSession(hour: 9), BuildSession(hour: 9), BuildSession(hour: 14)
        };
        _uow.FlowSessions.GetSessionsByDateRangeAsync(
            _userId, Arg.Any<DateTime>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns(sessions);

        var result = await _handler.Handle(new GetFlowInsightsQuery(), CancellationToken.None);

        result.BestHour.ShouldBe(9);
    }

    [Fact]
    public async Task Handle_ShouldReturnZeros_WhenNoSessions()
    {
        _uow.FlowSessions.GetSessionsByDateRangeAsync(
            _userId, Arg.Any<DateTime>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns(Array.Empty<FlowSession>());

        var result = await _handler.Handle(new GetFlowInsightsQuery(), CancellationToken.None);

        result.WeekSessionCount.ShouldBe(0);
        result.WeekTotalMinutes.ShouldBe(0);
        result.BestHour.ShouldBeNull();
    }
}
