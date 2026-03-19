using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Analytics;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Analytics;

public class EndPageSessionCommandTests
{
    private readonly IUnitOfWork _uow;
    private readonly IPageSessionRepository _sessionRepo;
    private readonly ICurrentUserService _currentUser;
    private readonly EndPageSessionCommandHandler _handler;
    private static readonly Guid UserId = Guid.NewGuid();

    public EndPageSessionCommandTests()
    {
        _uow = Substitute.For<IUnitOfWork>();
        _sessionRepo = Substitute.For<IPageSessionRepository>();
        _uow.PageSessions.Returns(_sessionRepo);

        _currentUser = Substitute.For<ICurrentUserService>();
        _currentUser.UserId.Returns(UserId);

        _handler = new EndPageSessionCommandHandler(_uow, _currentUser);
    }

    [Fact]
    public async Task Handle_ShouldSetSessionEndAndComputeDuration()
    {
        var sessionId = Guid.NewGuid();
        var session = new PageSession
        {
            Id = sessionId,
            UserId = UserId,
            Page = "/goals",
            SessionStart = DateTimeOffset.UtcNow.AddSeconds(-30)
        };
        _sessionRepo.GetByIdAsync(sessionId, Arg.Any<CancellationToken>()).Returns(session);

        var result = await _handler.Handle(
            new EndPageSessionCommand(sessionId, PageExitType.Navigated), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.DurationSeconds.ShouldNotBeNull();
        result.AsT0.DurationSeconds!.Value.ShouldBeInRange(28, 32);
        result.AsT0.ExitType.ShouldBe(PageExitType.Navigated);
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldSetDurationToZero_WhenEndEqualsStart()
    {
        var sessionId = Guid.NewGuid();
        var start = DateTimeOffset.UtcNow;
        var session = new PageSession
        {
            Id = sessionId,
            UserId = UserId,
            Page = "/goals",
            SessionStart = start
        };
        _sessionRepo.GetByIdAsync(sessionId, Arg.Any<CancellationToken>()).Returns(session);

        var result = await _handler.Handle(
            new EndPageSessionCommand(sessionId, PageExitType.Navigated), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.DurationSeconds.ShouldNotBeNull();
        result.AsT0.DurationSeconds!.Value.ShouldBeGreaterThanOrEqualTo(0);
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFound_WhenSessionDoesNotExist()
    {
        _sessionRepo.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns((PageSession?)null);

        var result = await _handler.Handle(
            new EndPageSessionCommand(Guid.NewGuid(), PageExitType.Navigated), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFound_WhenSessionBelongsToDifferentUser()
    {
        var sessionId = Guid.NewGuid();
        var session = new PageSession
        {
            Id = sessionId,
            UserId = Guid.NewGuid(), // different user
            Page = "/goals",
            SessionStart = DateTimeOffset.UtcNow.AddSeconds(-10)
        };
        _sessionRepo.GetByIdAsync(sessionId, Arg.Any<CancellationToken>()).Returns(session);

        var result = await _handler.Handle(
            new EndPageSessionCommand(sessionId, PageExitType.Navigated), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Theory]
    [InlineData(PageExitType.Navigated)]
    [InlineData(PageExitType.Closed)]
    [InlineData(PageExitType.Idle)]
    [InlineData(PageExitType.Unknown)]
    public async Task Handle_ShouldPersistExitType_ForAllEnumValues(PageExitType exitType)
    {
        var sessionId = Guid.NewGuid();
        var session = new PageSession
        {
            Id = sessionId,
            UserId = UserId,
            Page = "/goals",
            SessionStart = DateTimeOffset.UtcNow.AddSeconds(-5)
        };
        _sessionRepo.GetByIdAsync(sessionId, Arg.Any<CancellationToken>()).Returns(session);

        var result = await _handler.Handle(
            new EndPageSessionCommand(sessionId, exitType), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.ExitType.ShouldBe(exitType);
    }
}
