using FluentValidation;
using FluentValidation.Results;
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

public class CompleteFlowSessionCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly IFlowSessionRepository _repo = Substitute.For<IFlowSessionRepository>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly CompleteFlowSessionCommandHandler _handler;

    public CompleteFlowSessionCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _uow.FlowSessions.Returns(_repo);
        _handler = new CompleteFlowSessionCommandHandler(_uow, _currentUser);
    }

    private FlowSession MakeActiveSession(Guid? userId = null) => new()
    {
        Id = Guid.NewGuid(),
        UserId = userId ?? _userId,
        PlannedMinutes = 90,
        StartedAt = DateTime.UtcNow.AddMinutes(-30),
        EnergyLevel = EnergyLevel.Deep,
        AmbientSound = AmbientSoundMode.BrownNoise,
    };

    private static CompleteFlowSessionCommand ValidCommand(Guid sessionId) =>
        new(sessionId, "Fully", 4, 3, null);

    [Fact]
    public async Task Handle_ReturnsDto_WithEndedAtSet_WhenSessionIsValid()
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
    public async Task Handle_ReturnsValidationError_WhenSessionAlreadyCompleted()
    {
        var session = MakeActiveSession();
        session.EndedAt = DateTime.UtcNow.AddMinutes(-5);
        _repo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);

        var result = await _handler.Handle(ValidCommand(session.Id), CancellationToken.None);

        result.IsT2.ShouldBeTrue();
        result.AsT2.Errors.ShouldContain(e => e.PropertyName == "SessionId");
    }

    [Fact]
    public async Task Handle_SetsWasInterrupted_ToFalse_OnNormalComplete()
    {
        var session = MakeActiveSession();
        _repo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);

        var result = await _handler.Handle(ValidCommand(session.Id), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.WasInterrupted.ShouldBeFalse();
    }

    [Fact]
    public async Task Handle_CallsSaveChangesAsync_WhenSessionIsValid()
    {
        var session = MakeActiveSession();
        _repo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);

        await _handler.Handle(ValidCommand(session.Id), CancellationToken.None);

        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}

// ── Validator unit tests ───────────────────────────────────────────────────────

public class CompleteFlowSessionCommandValidatorTests
{
    private readonly CompleteFlowSessionCommandValidator _validator = new();

    private static CompleteFlowSessionCommand MakeCommand(
        string outcome = "Fully",
        int flowQuality = 3,
        int energyAfter = 3,
        string? blockers = null) =>
        new(Guid.NewGuid(), outcome, flowQuality, energyAfter, blockers);

    [Fact]
    public void Validate_Fails_WhenOutcomeIsEmpty()
    {
        var result = _validator.Validate(MakeCommand(outcome: ""));

        result.IsValid.ShouldBeFalse();
        result.Errors.ShouldContain(e => e.PropertyName == nameof(CompleteFlowSessionCommand.Outcome));
    }

    [Fact]
    public void Validate_Fails_WhenOutcomeIsInvalidValue()
    {
        var result = _validator.Validate(MakeCommand(outcome: "Maybe"));

        result.IsValid.ShouldBeFalse();
        result.Errors.ShouldContain(e => e.PropertyName == nameof(CompleteFlowSessionCommand.Outcome));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Validate_Fails_WhenFlowQualityRatingIsBelowMinimum(int rating)
    {
        var result = _validator.Validate(MakeCommand(flowQuality: rating));

        result.IsValid.ShouldBeFalse();
        result.Errors.ShouldContain(e => e.PropertyName == nameof(CompleteFlowSessionCommand.FlowQualityRating));
    }

    [Fact]
    public void Validate_Fails_WhenFlowQualityRatingExceedsMaximum()
    {
        var result = _validator.Validate(MakeCommand(flowQuality: 6));

        result.IsValid.ShouldBeFalse();
        result.Errors.ShouldContain(e => e.PropertyName == nameof(CompleteFlowSessionCommand.FlowQualityRating));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Validate_Fails_WhenEnergyAfterRatingIsBelowMinimum(int rating)
    {
        var result = _validator.Validate(MakeCommand(energyAfter: rating));

        result.IsValid.ShouldBeFalse();
        result.Errors.ShouldContain(e => e.PropertyName == nameof(CompleteFlowSessionCommand.EnergyAfterRating));
    }

    [Fact]
    public void Validate_Passes_WithAllValidValues()
    {
        var result = _validator.Validate(MakeCommand(outcome: "Fully", flowQuality: 3, energyAfter: 3));

        result.IsValid.ShouldBeTrue();
    }
}
