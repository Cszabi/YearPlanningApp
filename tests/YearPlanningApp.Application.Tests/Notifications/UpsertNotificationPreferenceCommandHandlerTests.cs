using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Notifications;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Notifications;

public class UpsertNotificationPreferenceCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly UpsertNotificationPreferenceCommandHandler _handler;

    public UpsertNotificationPreferenceCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new UpsertNotificationPreferenceCommandHandler(_uow, _currentUser);
    }

    private UpsertNotificationPreferenceCommand BuildCommand() => new(
        true, DayOfWeek.Sunday, 18, true, "3,7", true, 20, "Europe/Budapest");

    [Fact]
    public async Task Handle_ShouldUpsertPreferences_AndReturnSuccess()
    {
        NotificationPreference? upserted = null;
        await _uow.NotificationPreferences.UpsertAsync(
            Arg.Do<NotificationPreference>(p => upserted = p), Arg.Any<CancellationToken>());

        var result = await _handler.Handle(BuildCommand(), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        upserted.ShouldNotBeNull();
        upserted!.UserId.ShouldBe(_userId);
        upserted.WeeklyReviewHour.ShouldBe(18);
        upserted.TimezoneId.ShouldBe("Europe/Budapest");
    }
}
