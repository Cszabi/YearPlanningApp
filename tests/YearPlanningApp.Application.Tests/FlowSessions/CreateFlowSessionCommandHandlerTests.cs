using FluentValidation;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.FlowSessions;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;
using YearPlanningApp.Infrastructure.Persistence;

namespace YearPlanningApp.Application.Tests.FlowSessions;

// ── Handler unit tests (NSubstitute) ──────────────────────────────────────────

public class CreateFlowSessionCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly IFlowSessionRepository _repo = Substitute.For<IFlowSessionRepository>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly CreateFlowSessionCommandHandler _handler;

    public CreateFlowSessionCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _uow.FlowSessions.Returns(_repo);
        _handler = new CreateFlowSessionCommandHandler(_uow, _currentUser);
    }

    private static CreateFlowSessionCommand ValidCommand(Guid? goalId = null) =>
        new(goalId, null, "Ship the feature", 90, "Deep", "BrownNoise");

    [Fact]
    public async Task Handle_ReturnsDto_WithCorrectGoalId_WhenGoalIdProvided()
    {
        var goalId = Guid.NewGuid();
        var result = await _handler.Handle(ValidCommand(goalId), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.GoalId.ShouldBe(goalId);
    }

    [Fact]
    public async Task Handle_ReturnsDto_WithNullGoalId_WhenNoneProvided()
    {
        var result = await _handler.Handle(ValidCommand(null), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.GoalId.ShouldBeNull();
    }

    [Fact]
    public async Task Handle_SetStartedAt_ToApproximatelyNow()
    {
        var before = DateTime.UtcNow;
        var result = await _handler.Handle(ValidCommand(), CancellationToken.None);
        var after = DateTime.UtcNow;

        result.IsT0.ShouldBeTrue();
        result.AsT0.StartedAt.ShouldBeInRange(before, after);
    }

    [Fact]
    public async Task Handle_SetsEndedAt_ToNull_SessionIsActiveOnCreation()
    {
        var result = await _handler.Handle(ValidCommand(), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.EndedAt.ShouldBeNull();
    }

    [Fact]
    public async Task Handle_PersistsSession_AndSavesChanges()
    {
        await _handler.Handle(ValidCommand(), CancellationToken.None);

        await _repo.Received(1).AddAsync(Arg.Any<Domain.Entities.FlowSession>(), Arg.Any<CancellationToken>());
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ReturnsDto_WithCorrectPlannedMinutes()
    {
        var result = await _handler.Handle(ValidCommand(), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.PlannedMinutes.ShouldBe(90);
    }

    [Fact]
    public async Task Handle_ReturnsDto_WithNonEmptyId()
    {
        var result = await _handler.Handle(ValidCommand(), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Id.ShouldNotBe(Guid.Empty);
    }
}

// ── Validator unit tests ───────────────────────────────────────────────────────

public class CreateFlowSessionCommandValidatorTests
{
    private readonly CreateFlowSessionCommandValidator _validator = new();

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-100)]
    public void Validate_Fails_WhenPlannedMinutesIsZeroOrNegative(int minutes)
    {
        var command = new CreateFlowSessionCommand(null, null, null, minutes, "Deep", "BrownNoise");
        var result = _validator.Validate(command);
        result.IsValid.ShouldBeFalse();
        result.Errors.ShouldContain(e => e.PropertyName == nameof(command.PlannedMinutes));
    }

    [Fact]
    public void Validate_Fails_WhenPlannedMinutesExceedsMax()
    {
        var command = new CreateFlowSessionCommand(null, null, null, 721, "Deep", "BrownNoise");
        var result = _validator.Validate(command);
        result.IsValid.ShouldBeFalse();
    }

    [Fact]
    public void Validate_Fails_WhenEnergyLevelIsInvalid()
    {
        var command = new CreateFlowSessionCommand(null, null, null, 60, "Extreme", "BrownNoise");
        var result = _validator.Validate(command);
        result.IsValid.ShouldBeFalse();
        result.Errors.ShouldContain(e => e.PropertyName == nameof(command.EnergyLevel));
    }

    [Fact]
    public void Validate_Fails_WhenAmbientSoundIsInvalid()
    {
        var command = new CreateFlowSessionCommand(null, null, null, 60, "Deep", "Jazz");
        var result = _validator.Validate(command);
        result.IsValid.ShouldBeFalse();
        result.Errors.ShouldContain(e => e.PropertyName == nameof(command.AmbientSound));
    }

    [Theory]
    [InlineData("Deep")]
    [InlineData("Medium")]
    [InlineData("Shallow")]
    public void Validate_Passes_ForValidEnergyLevels(string level)
    {
        var command = new CreateFlowSessionCommand(null, null, null, 60, level, "BrownNoise");
        _validator.Validate(command).IsValid.ShouldBeTrue();
    }

    [Theory]
    [InlineData("None")]
    [InlineData("BrownNoise")]
    [InlineData("WhiteNoise")]
    [InlineData("Nature")]
    public void Validate_Passes_ForValidAmbientSounds(string sound)
    {
        var command = new CreateFlowSessionCommand(null, null, null, 60, "Deep", sound);
        _validator.Validate(command).IsValid.ShouldBeTrue();
    }
}

// ── Integration tests (in-memory EF Core) ─────────────────────────────────────

public class CreateFlowSessionIntegrationTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly UnitOfWork _uow;
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly CreateFlowSessionCommandHandler _handler;

    public CreateFlowSessionIntegrationTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _uow = new UnitOfWork(_context);

        _currentUser.UserId.Returns(_userId);
        _handler = new CreateFlowSessionCommandHandler(_uow, _currentUser);
    }

    private static CreateFlowSessionCommand ValidCommand() =>
        new(null, null, "Focus block", 90, "Deep", "BrownNoise");

    [Fact]
    public async Task Handle_CreatesSessionInDatabase()
    {
        var result = await _handler.Handle(ValidCommand(), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        var saved = await _uow.FlowSessions.GetByIdAsync(result.AsT0.Id);
        saved.ShouldNotBeNull();
        saved!.PlannedMinutes.ShouldBe(90);
    }

    [Fact]
    public async Task Handle_ReturnsDtoWithNonEmptyId()
    {
        var result = await _handler.Handle(ValidCommand(), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Id.ShouldNotBe(Guid.Empty);
    }

    [Fact]
    public async Task Handle_TwoConsecutiveCalls_CreateTwoSeparateSessions()
    {
        var r1 = await _handler.Handle(ValidCommand(), CancellationToken.None);
        var r2 = await _handler.Handle(ValidCommand(), CancellationToken.None);

        r1.IsT0.ShouldBeTrue();
        r2.IsT0.ShouldBeTrue();
        r1.AsT0.Id.ShouldNotBe(r2.AsT0.Id);

        var all = (await _uow.FlowSessions.GetAllAsync()).ToList();
        all.Count.ShouldBe(2);
    }

    public void Dispose() => _uow.Dispose();
}
