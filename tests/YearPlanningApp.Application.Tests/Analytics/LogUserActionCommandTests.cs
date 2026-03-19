using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Analytics;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Analytics;

public class LogUserActionCommandTests
{
    private readonly IUnitOfWork _uow;
    private readonly IUserActionRepository _actionRepo;
    private readonly ICurrentUserService _currentUser;
    private readonly IAnalyticsBuffer _buffer;
    private readonly LogUserActionCommandHandler _handler;
    private static readonly Guid UserId = Guid.NewGuid();

    public LogUserActionCommandTests()
    {
        _uow = Substitute.For<IUnitOfWork>();
        _actionRepo = Substitute.For<IUserActionRepository>();
        _uow.UserActions.Returns(_actionRepo);

        _currentUser = Substitute.For<ICurrentUserService>();
        _currentUser.UserId.Returns(UserId);

        _buffer = Substitute.For<IAnalyticsBuffer>();

        _handler = new LogUserActionCommandHandler(_uow, _currentUser, _buffer);
    }

    [Fact]
    public async Task Handle_ShouldBufferAction_WhenRedisIsAvailable()
    {
        _buffer.IsAvailable.Returns(true);
        var command = new LogUserActionCommand(Guid.NewGuid(), "/goals", "goal_opened", "goal-123", null);

        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        await _buffer.Received(1).BufferActionAsync(Arg.Any<UserAction>(), Arg.Any<CancellationToken>());
        await _actionRepo.DidNotReceive().AddAsync(Arg.Any<UserAction>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldFallbackToDb_WhenRedisIsUnavailable()
    {
        _buffer.IsAvailable.Returns(false);
        var command = new LogUserActionCommand(Guid.NewGuid(), "/goals", "goal_opened", null, null);

        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        await _buffer.DidNotReceive().BufferActionAsync(Arg.Any<UserAction>(), Arg.Any<CancellationToken>());
        await _actionRepo.Received(1).AddAsync(Arg.Any<UserAction>(), Arg.Any<CancellationToken>());
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public void Validator_ShouldReturnError_WhenActionTypeIsEmpty()
    {
        var validator = new LogUserActionCommandValidator();
        var command = new LogUserActionCommand(Guid.NewGuid(), "/goals", "", null, null);

        var result = validator.Validate(command);

        result.IsValid.ShouldBeFalse();
    }

    [Fact]
    public void Validator_ShouldReturnError_WhenActionTypeExceeds100Chars()
    {
        var validator = new LogUserActionCommandValidator();
        var command = new LogUserActionCommand(Guid.NewGuid(), "/goals", new string('x', 101), null, null);

        var result = validator.Validate(command);

        result.IsValid.ShouldBeFalse();
    }

    [Fact]
    public async Task Handle_ShouldSucceed_WhenActionLabelAndMetadataAreNull()
    {
        _buffer.IsAvailable.Returns(true);
        var command = new LogUserActionCommand(Guid.NewGuid(), "/goals", "goal_opened", null, null);

        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsT0.ShouldBeTrue();
    }
}
