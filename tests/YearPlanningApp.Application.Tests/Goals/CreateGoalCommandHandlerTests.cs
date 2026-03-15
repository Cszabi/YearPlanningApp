using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Goals;

public class CreateGoalCommandHandlerTests
{
    private readonly IUnitOfWork _uow;
    private readonly IGoalRepository _goalRepo;
    private readonly ICurrentUserService _currentUser;
    private readonly CreateGoalCommandHandler _handler;

    private static readonly Guid UserId = Guid.NewGuid();

    public CreateGoalCommandHandlerTests()
    {
        _uow = Substitute.For<IUnitOfWork>();
        _goalRepo = Substitute.For<IGoalRepository>();
        _uow.Goals.Returns(_goalRepo);

        _currentUser = Substitute.For<ICurrentUserService>();
        _currentUser.UserId.Returns(UserId);

        _handler = new CreateGoalCommandHandler(_uow, _currentUser);
    }

    [Fact]
    public async Task Handle_ShouldCreateGoal_WhenDeepAndUnder3Active()
    {
        _goalRepo.CountActiveDeepWorkGoalsAsync(UserId, 2026, Arg.Any<CancellationToken>())
            .Returns(2);

        var command = new CreateGoalCommand(
            2026, "Learn Rust", GoalType.Project, LifeArea.LearningGrowth,
            EnergyLevel.Deep, null, null, []);

        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Title.ShouldBe("Learn Rust");
        result.AsT0.EnergyLevel.ShouldBe("Deep");
        await _goalRepo.Received(1).AddAsync(Arg.Any<Domain.Entities.Goal>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldReturnConflict_WhenDeepAndAlready3Active()
    {
        _goalRepo.CountActiveDeepWorkGoalsAsync(UserId, 2026, Arg.Any<CancellationToken>())
            .Returns(3);

        var command = new CreateGoalCommand(
            2026, "Fourth deep goal", GoalType.Project, LifeArea.CareerWork,
            EnergyLevel.Deep, null, null, []);

        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsT2.ShouldBeTrue();
        result.AsT2.Message.ShouldContain("3 active Deep Work goals");
        await _goalRepo.DidNotReceive().AddAsync(Arg.Any<Domain.Entities.Goal>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldCreateGoal_WhenMediumEnergyRegardlessOfDeepCount()
    {
        _goalRepo.CountActiveDeepWorkGoalsAsync(UserId, 2026, Arg.Any<CancellationToken>())
            .Returns(5); // doesn't matter for non-deep

        var command = new CreateGoalCommand(
            2026, "Read 12 books", GoalType.Repetitive, LifeArea.LearningGrowth,
            EnergyLevel.Medium, null, null, []);

        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        // CountActiveDeepWorkGoals should NOT have been called for non-deep
        await _goalRepo.DidNotReceive()
            .CountActiveDeepWorkGoalsAsync(Arg.Any<Guid>(), Arg.Any<int>(), Arg.Any<CancellationToken>());
    }
}
