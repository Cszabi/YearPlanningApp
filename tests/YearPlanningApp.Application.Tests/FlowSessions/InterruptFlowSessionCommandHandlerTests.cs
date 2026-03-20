using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Application.FlowSessions;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.FlowSessions;

// ── Handler unit tests ────────────────────────────────────────────────────────

public class InterruptFlowSessionCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly IFlowSessionRepository _repo = Substitute.For<IFlowSessionRepository>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly InterruptFlowSessionCommandHandler _handler;

    public InterruptFlowSessionCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _uow.FlowSessions.Returns(_repo);
        _handler = new InterruptFlowSessionCommandHandler(_uow, _currentUser);
    }

    private FlowSession MakeActiveSession(Guid? userId = null) => new()
    {
        Id = Guid.NewGuid(),
        UserId = userId ?? _userId,
        PlannedMinutes = 60,
        StartedAt = DateTime.UtcNow.AddMinutes(-20),
        EnergyLevel = EnergyLevel.Medium,
        AmbientSound = AmbientSoundMode.None,
    };

    private static InterruptFlowSessionCommand ValidCommand(Guid sessionId, string? reason = "Phone call") =>
        new(sessionId, reason);

    [Fact]
    public async Task Handle_ReturnsDto_WithWasInterrupted_True()
    {
        var session = MakeActiveSession();
        _repo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);

        var result = await _handler.Handle(ValidCommand(session.Id), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.WasInterrupted.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ReturnsDto_WithEndedAtSet()
    {
        var session = MakeActiveSession();
        _repo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);

        var before = DateTime.UtcNow;
        var result = await _handler.Handle(ValidCommand(session.Id), CancellationToken.None);
        var after = DateTime.UtcNow;

        result.IsT0.ShouldBeTrue();
        result.AsT0.EndedAt.ShouldNotBeNull();
        result.AsT0.EndedAt!.Value.ShouldBeInRange(before, after);
    }

    [Fact]
    public async Task Handle_ReturnsDto_WithInterruptionReasonSet()
    {
        var session = MakeActiveSession();
        _repo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);

        var result = await _handler.Handle(ValidCommand(session.Id, reason: "Urgent meeting"), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.InterruptionReason.ShouldBe("Urgent meeting");
    }

    [Fact]
    public async Task Handle_ReturnsNotFoundError_WhenSessionIsNull()
    {
        var missingId = Guid.NewGuid();
        _repo.GetByIdAsync(missingId, Arg.Any<CancellationToken>()).Returns((FlowSession?)null);

        var result = await _handler.Handle(ValidCommand(missingId), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
        result.AsT1.EntityName.ShouldBe("FlowSession");
        result.AsT1.Id.ShouldBe(missingId);
    }

    [Fact]
    public async Task Handle_ReturnsNotFoundError_WhenSessionBelongsToDifferentUser()
    {
        var session = MakeActiveSession(userId: Guid.NewGuid());
        _repo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);

        var result = await _handler.Handle(ValidCommand(session.Id), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
        result.AsT1.EntityName.ShouldBe("FlowSession");
    }

    [Fact]
    public async Task Handle_CallsSaveChangesAsync_WhenSessionIsFound()
    {
        var session = MakeActiveSession();
        _repo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);

        await _handler.Handle(ValidCommand(session.Id), CancellationToken.None);

        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
