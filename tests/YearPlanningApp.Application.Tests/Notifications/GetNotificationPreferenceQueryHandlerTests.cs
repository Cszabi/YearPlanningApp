using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Notifications;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Notifications;

public class GetNotificationPreferenceQueryHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly GetNotificationPreferenceQueryHandler _handler;

    public GetNotificationPreferenceQueryHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new GetNotificationPreferenceQueryHandler(_uow, _currentUser);
    }

    [Fact]
    public async Task Handle_ShouldReturnDefaultPreferences_WhenNoneExist()
    {
        _uow.NotificationPreferences.GetByUserIdAsync(_userId, Arg.Any<CancellationToken>())
            .Returns((NotificationPreference?)null);

        var result = await _handler.Handle(new GetNotificationPreferenceQuery(), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        // Defaults are returned without error
    }

    [Fact]
    public async Task Handle_ShouldReturnExistingPreferences_WhenTheyExist()
    {
        var pref = new NotificationPreference
        {
            UserId = _userId, WeeklyReviewEnabled = true, WeeklyReviewDayOfWeek = DayOfWeek.Sunday,
            WeeklyReviewHour = 18, GoalDeadlineEnabled = false, GoalDeadlineDaysBeforeList = "3,7",
            HabitStreakRiskEnabled = true, HabitStreakRiskHour = 20, TimezoneId = "Europe/Budapest"
        };
        _uow.NotificationPreferences.GetByUserIdAsync(_userId, Arg.Any<CancellationToken>()).Returns(pref);

        var result = await _handler.Handle(new GetNotificationPreferenceQuery(), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.WeeklyReviewEnabled.ShouldBeTrue();
        result.AsT0.TimezoneId.ShouldBe("Europe/Budapest");
    }
}
