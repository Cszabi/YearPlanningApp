using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Goals;

public class SendGoalEmailCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly IEmailService _emailService = Substitute.For<IEmailService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly SendGoalEmailCommandHandler _handler;

    public SendGoalEmailCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _currentUser.Email.Returns("user@example.com");
        _handler = new SendGoalEmailCommandHandler(_uow, _currentUser, _emailService);
    }

    private Goal BuildGoal() => new()
    {
        Id = Guid.NewGuid(), UserId = _userId, Year = 2026, Title = "My Goal",
        GoalType = GoalType.Project, Status = GoalStatus.Active, LifeArea = LifeArea.CareerWork,
        EnergyLevel = EnergyLevel.Deep, AlignedValueNames = "[]",
        Milestones = new List<Milestone>()
    };

    [Fact]
    public async Task Handle_ShouldSendEmail_WhenGoalExistsAndEmailIsSet()
    {
        var goal = BuildGoal();
        _uow.Goals.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns(new[] { goal });
        _uow.Goals.CalculateGoalProgressAsync(goal.Id, Arg.Any<CancellationToken>()).Returns(50.0);

        var result = await _handler.Handle(new SendGoalEmailCommand(goal.Id, 2026), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        await _emailService.Received(1).SendAsync(
            "user@example.com",
            Arg.Any<string>(),
            Arg.Is<string>(s => s.Contains("My Goal")),
            Arg.Any<string>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenGoalDoesNotExist()
    {
        _uow.Goals.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns(Array.Empty<Goal>());

        var result = await _handler.Handle(new SendGoalEmailCommand(Guid.NewGuid(), 2026), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
        await _emailService.DidNotReceive().SendAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldReturnConflictError_WhenEmailIsEmpty()
    {
        var goal = BuildGoal();
        _uow.Goals.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns(new[] { goal });
        _currentUser.Email.Returns(string.Empty);

        var result = await _handler.Handle(new SendGoalEmailCommand(goal.Id, 2026), CancellationToken.None);

        result.IsT2.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnConflictError_WhenEmailServiceThrows()
    {
        var goal = BuildGoal();
        _uow.Goals.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns(new[] { goal });
        _uow.Goals.CalculateGoalProgressAsync(goal.Id, Arg.Any<CancellationToken>()).Returns(0.0);
        _emailService.SendAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns<Task>(_ => throw new Exception("SMTP error"));

        var result = await _handler.Handle(new SendGoalEmailCommand(goal.Id, 2026), CancellationToken.None);

        result.IsT2.ShouldBeTrue();
    }
}
