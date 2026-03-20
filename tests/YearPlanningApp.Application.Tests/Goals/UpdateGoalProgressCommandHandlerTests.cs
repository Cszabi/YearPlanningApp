using Microsoft.EntityFrameworkCore;
using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;
using YearPlanningApp.Infrastructure.Persistence;

namespace YearPlanningApp.Application.Tests.Goals;

// ── Handler unit tests (NSubstitute) ──────────────────────────────────────────

public class UpdateGoalProgressCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly IGoalRepository _goalRepo = Substitute.For<IGoalRepository>();
    private readonly IGoalProgressSnapshotRepository _snapshotRepo = Substitute.For<IGoalProgressSnapshotRepository>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly UpdateGoalProgressCommandHandler _handler;

    public UpdateGoalProgressCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _uow.Goals.Returns(_goalRepo);
        _uow.GoalProgressSnapshots.Returns(_snapshotRepo);
        _handler = new UpdateGoalProgressCommandHandler(_uow, _currentUser);
    }

    private Goal BuildProjectGoal(int progressPercent = 0) => new()
    {
        Id = Guid.NewGuid(),
        UserId = _userId,
        Year = 2026,
        Title = "Launch app",
        GoalType = GoalType.Project,
        Status = GoalStatus.Active,
        LifeArea = LifeArea.CareerWork,
        EnergyLevel = EnergyLevel.Deep,
        ProgressPercent = progressPercent,
        AlignedValueNames = "[]",
        Milestones = new List<Milestone>(),
    };

    [Fact]
    public async Task Handle_UpdatesProgressPercent_WhenGoalExists()
    {
        var goal = BuildProjectGoal();
        _goalRepo.GetByIdAsync(goal.Id, Arg.Any<CancellationToken>()).Returns(goal);

        var result = await _handler.Handle(new UpdateGoalProgressCommand(goal.Id, 50), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.ProgressPercent.ShouldBe(50);
    }

    [Fact]
    public async Task Handle_ReturnsNotFound_WhenGoalMissing()
    {
        _goalRepo.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Goal?)null);

        var result = await _handler.Handle(new UpdateGoalProgressCommand(Guid.NewGuid(), 50), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ReturnsNotFound_WhenGoalBelongsToOtherUser()
    {
        var goal = BuildProjectGoal();
        goal.UserId = Guid.NewGuid();
        _goalRepo.GetByIdAsync(goal.Id, Arg.Any<CancellationToken>()).Returns(goal);

        var result = await _handler.Handle(new UpdateGoalProgressCommand(goal.Id, 50), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ReturnsValidationError_ForRepetitiveGoal()
    {
        var goal = BuildProjectGoal();
        goal.GoalType = GoalType.Repetitive;
        _goalRepo.GetByIdAsync(goal.Id, Arg.Any<CancellationToken>()).Returns(goal);

        var result = await _handler.Handle(new UpdateGoalProgressCommand(goal.Id, 50), CancellationToken.None);

        result.IsT2.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_SetsStatusToAchieved_WhenProgressReaches100()
    {
        var goal = BuildProjectGoal(progressPercent: 80);
        _goalRepo.GetByIdAsync(goal.Id, Arg.Any<CancellationToken>()).Returns(goal);

        var result = await _handler.Handle(new UpdateGoalProgressCommand(goal.Id, 100), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Status.ShouldBe(GoalStatus.Achieved.ToString());
    }

    [Fact]
    public async Task Handle_SetsCompletedAt_WhenProgressReaches100()
    {
        var before = DateTime.UtcNow;
        var goal = BuildProjectGoal(progressPercent: 0);
        _goalRepo.GetByIdAsync(goal.Id, Arg.Any<CancellationToken>()).Returns(goal);

        await _handler.Handle(new UpdateGoalProgressCommand(goal.Id, 100), CancellationToken.None);

        goal.CompletedAt.ShouldNotBeNull();
        goal.CompletedAt!.Value.ShouldBeGreaterThanOrEqualTo(before);
    }

    [Fact]
    public async Task Handle_RevertsToActive_WhenProgressLoweredFrom100()
    {
        var goal = BuildProjectGoal(progressPercent: 100);
        goal.Status = GoalStatus.Achieved;
        goal.CompletedAt = DateTime.UtcNow.AddDays(-1);
        _goalRepo.GetByIdAsync(goal.Id, Arg.Any<CancellationToken>()).Returns(goal);

        var result = await _handler.Handle(new UpdateGoalProgressCommand(goal.Id, 90), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Status.ShouldBe(GoalStatus.Active.ToString());
        goal.CompletedAt.ShouldBeNull();
    }

    [Fact]
    public async Task Handle_CallsUpsertTodayAndSaveChanges()
    {
        var goal = BuildProjectGoal();
        _goalRepo.GetByIdAsync(goal.Id, Arg.Any<CancellationToken>()).Returns(goal);

        await _handler.Handle(new UpdateGoalProgressCommand(goal.Id, 60), CancellationToken.None);

        await _snapshotRepo.Received(1).UpsertTodayAsync(goal.Id, _userId, 60, Arg.Any<CancellationToken>());
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}

// ── Validator tests ────────────────────────────────────────────────────────────

public class UpdateGoalProgressCommandValidatorTests
{
    private readonly UpdateGoalProgressCommandValidator _validator = new();

    [Theory]
    [InlineData(-1)]
    [InlineData(101)]
    [InlineData(200)]
    public void Validate_Fails_WhenPercentOutOfRange(int percent)
    {
        var result = _validator.Validate(new UpdateGoalProgressCommand(Guid.NewGuid(), percent));
        result.IsValid.ShouldBeFalse();
        result.Errors.ShouldContain(e => e.PropertyName == nameof(UpdateGoalProgressCommand.ProgressPercent));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(50)]
    [InlineData(100)]
    public void Validate_Passes_ForValidPercent(int percent)
    {
        var result = _validator.Validate(new UpdateGoalProgressCommand(Guid.NewGuid(), percent));
        result.IsValid.ShouldBeTrue();
    }
}

// ── GetGoalProgressHistory handler tests ──────────────────────────────────────

public class GetGoalProgressHistoryQueryHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly IGoalRepository _goalRepo = Substitute.For<IGoalRepository>();
    private readonly IGoalProgressSnapshotRepository _snapshotRepo = Substitute.For<IGoalProgressSnapshotRepository>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly GetGoalProgressHistoryQueryHandler _handler;

    public GetGoalProgressHistoryQueryHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _uow.Goals.Returns(_goalRepo);
        _uow.GoalProgressSnapshots.Returns(_snapshotRepo);
        _handler = new GetGoalProgressHistoryQueryHandler(_uow, _currentUser);
    }

    [Fact]
    public async Task Handle_ReturnsNotFound_WhenGoalMissing()
    {
        _goalRepo.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Goal?)null);

        var result = await _handler.Handle(new GetGoalProgressHistoryQuery(Guid.NewGuid()), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ReturnsNotFound_WhenGoalBelongsToOtherUser()
    {
        var goal = new Goal { Id = Guid.NewGuid(), UserId = Guid.NewGuid() };
        _goalRepo.GetByIdAsync(goal.Id, Arg.Any<CancellationToken>()).Returns(goal);

        var result = await _handler.Handle(new GetGoalProgressHistoryQuery(goal.Id), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ReturnsSnapshots_WhenGoalExists()
    {
        var goalId = Guid.NewGuid();
        var goal = new Goal { Id = goalId, UserId = _userId };
        var snapshots = new List<GoalProgressSnapshot>
        {
            new() { Id = Guid.NewGuid(), GoalId = goalId, UserId = _userId, ProgressPercent = 20, SnapshotDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-2)) },
            new() { Id = Guid.NewGuid(), GoalId = goalId, UserId = _userId, ProgressPercent = 50, SnapshotDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1)) },
        };
        _goalRepo.GetByIdAsync(goalId, Arg.Any<CancellationToken>()).Returns(goal);
        _snapshotRepo.GetByGoalIdAsync(goalId, _userId, Arg.Any<CancellationToken>()).Returns(snapshots);

        var result = await _handler.Handle(new GetGoalProgressHistoryQuery(goalId), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Count.ShouldBe(2);
        result.AsT0[0].ProgressPercent.ShouldBe(20);
        result.AsT0[1].ProgressPercent.ShouldBe(50);
    }
}

// ── Snapshot upsert integration test ──────────────────────────────────────────

public class GoalProgressSnapshotRepositoryTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly UnitOfWork _uow;
    private readonly Guid _userId = Guid.NewGuid();

    public GoalProgressSnapshotRepositoryTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _uow = new UnitOfWork(_context);
    }

    private async Task<Goal> SeedGoalAsync()
    {
        var goal = new Goal
        {
            Id = Guid.NewGuid(), UserId = _userId, Year = 2026,
            Title = "Ship feature", GoalType = GoalType.Project,
            Status = GoalStatus.Active, LifeArea = LifeArea.CareerWork,
            EnergyLevel = EnergyLevel.Deep, AlignedValueNames = "[]",
        };
        await _uow.Goals.AddAsync(goal);
        await _uow.SaveChangesAsync();
        return goal;
    }

    [Fact]
    public async Task UpsertTodayAsync_CreatesSnapshot_WhenNoneExistsForToday()
    {
        var goal = await SeedGoalAsync();
        await _uow.GoalProgressSnapshots.UpsertTodayAsync(goal.Id, _userId, 40);
        await _uow.SaveChangesAsync();

        var history = (await _uow.GoalProgressSnapshots.GetByGoalIdAsync(goal.Id, _userId)).ToList();
        history.Count.ShouldBe(1);
        history[0].ProgressPercent.ShouldBe(40);
    }

    [Fact]
    public async Task UpsertTodayAsync_UpdatesExistingSnapshot_WhenCalledTwiceToday()
    {
        var goal = await SeedGoalAsync();

        await _uow.GoalProgressSnapshots.UpsertTodayAsync(goal.Id, _userId, 30);
        await _uow.SaveChangesAsync();

        await _uow.GoalProgressSnapshots.UpsertTodayAsync(goal.Id, _userId, 70);
        await _uow.SaveChangesAsync();

        var history = (await _uow.GoalProgressSnapshots.GetByGoalIdAsync(goal.Id, _userId)).ToList();
        history.Count.ShouldBe(1);
        history[0].ProgressPercent.ShouldBe(70);
    }

    [Fact]
    public async Task UpdateGoalProgressHandler_PersistsProgressAndSnapshot()
    {
        var goal = await SeedGoalAsync();
        var currentUser = Substitute.For<ICurrentUserService>();
        currentUser.UserId.Returns(_userId);

        var handler = new UpdateGoalProgressCommandHandler(_uow, currentUser);
        var result = await handler.Handle(new UpdateGoalProgressCommand(goal.Id, 55), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.ProgressPercent.ShouldBe(55);

        var saved = await _uow.Goals.GetByIdAsync(goal.Id);
        saved.ShouldNotBeNull();
        saved!.ProgressPercent.ShouldBe(55);

        var snapshots = (await _uow.GoalProgressSnapshots.GetByGoalIdAsync(goal.Id, _userId)).ToList();
        snapshots.Count.ShouldBe(1);
        snapshots[0].ProgressPercent.ShouldBe(55);
    }

    public void Dispose() => _uow.Dispose();
}
