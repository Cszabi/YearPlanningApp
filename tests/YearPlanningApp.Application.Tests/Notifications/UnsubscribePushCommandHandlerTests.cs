using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Notifications;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Notifications;

public class UnsubscribePushCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly UnsubscribePushCommandHandler _handler;

    public UnsubscribePushCommandHandlerTests()
    {
        _currentUser.UserId.Returns(Guid.NewGuid());
        _handler = new UnsubscribePushCommandHandler(_uow, _currentUser);
    }

    [Fact]
    public async Task Handle_ShouldDeactivateSubscription_AndReturnSuccess()
    {
        const string endpoint = "https://push.example.com/sub1";

        var result = await _handler.Handle(new UnsubscribePushCommand(endpoint), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        await _uow.PushSubscriptions.Received(1).DeactivateAsync(endpoint, Arg.Any<CancellationToken>());
    }
}
