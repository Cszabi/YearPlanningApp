using FluentValidation;
using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Analytics;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Analytics;

public class StartPageSessionCommandTests
{
    private readonly IUnitOfWork _uow;
    private readonly IPageSessionRepository _sessionRepo;
    private readonly ICurrentUserService _currentUser;
    private readonly StartPageSessionCommandHandler _handler;
    private static readonly Guid UserId = Guid.NewGuid();

    public StartPageSessionCommandTests()
    {
        _uow = Substitute.For<IUnitOfWork>();
        _sessionRepo = Substitute.For<IPageSessionRepository>();
        _uow.PageSessions.Returns(_sessionRepo);

        _currentUser = Substitute.For<ICurrentUserService>();
        _currentUser.UserId.Returns(UserId);

        _handler = new StartPageSessionCommandHandler(_uow, _currentUser);
    }

    [Fact]
    public async Task Handle_ShouldCreateSession_WithCorrectUserIdPageAndDeviceType()
    {
        var command = new StartPageSessionCommand("/goals", "desktop");

        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.UserId.ShouldBe(UserId);
        result.AsT0.Page.ShouldBe("/goals");
        result.AsT0.DeviceType.ShouldBe("desktop");
        await _sessionRepo.Received(1).AddAsync(Arg.Any<PageSession>(), Arg.Any<CancellationToken>());
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public void Validator_ShouldReturnError_WhenPageIsEmpty()
    {
        var validator = new StartPageSessionCommandValidator();
        var command = new StartPageSessionCommand("", null);

        var result = validator.Validate(command);

        result.IsValid.ShouldBeFalse();
    }

    [Fact]
    public void Validator_ShouldReturnError_WhenPageExceedsMaxLength()
    {
        var validator = new StartPageSessionCommandValidator();
        var command = new StartPageSessionCommand(new string('x', 101), null);

        var result = validator.Validate(command);

        result.IsValid.ShouldBeFalse();
    }

    [Fact]
    public async Task Handle_ShouldAllowConcurrentSessionsForSameUser_OnDifferentPages()
    {
        var commandA = new StartPageSessionCommand("/goals", "desktop");
        var commandB = new StartPageSessionCommand("/flow", "mobile");

        var resultA = await _handler.Handle(commandA, CancellationToken.None);
        var resultB = await _handler.Handle(commandB, CancellationToken.None);

        resultA.IsT0.ShouldBeTrue();
        resultB.IsT0.ShouldBeTrue();
        resultA.AsT0.Page.ShouldBe("/goals");
        resultB.AsT0.Page.ShouldBe("/flow");
    }
}
