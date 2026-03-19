using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Notifications;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Notifications;

public class SubscribePushCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly SubscribePushCommandHandler _handler;

    public SubscribePushCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new SubscribePushCommandHandler(_uow, _currentUser);
    }

    [Fact]
    public async Task Handle_ShouldUpsertSubscription_AndReturnSuccess()
    {
        PushSubscription? upserted = null;
        await _uow.PushSubscriptions.UpsertAsync(
            Arg.Do<PushSubscription>(s => upserted = s), Arg.Any<CancellationToken>());

        var result = await _handler.Handle(
            new SubscribePushCommand("https://push.example.com/sub1", "p256dh_key", "auth_key", "Chrome/120"),
            CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        upserted.ShouldNotBeNull();
        upserted!.UserId.ShouldBe(_userId);
        upserted.IsActive.ShouldBeTrue();
        upserted.Endpoint.ShouldBe("https://push.example.com/sub1");
    }
}
