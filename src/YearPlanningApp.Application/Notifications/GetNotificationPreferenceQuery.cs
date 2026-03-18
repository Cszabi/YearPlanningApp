using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Notifications;

public record NotificationPreferenceDto(
    bool WeeklyReviewEnabled,
    DayOfWeek WeeklyReviewDayOfWeek,
    int WeeklyReviewHour,
    bool GoalDeadlineEnabled,
    string GoalDeadlineDaysBeforeList,
    bool HabitStreakRiskEnabled,
    int HabitStreakRiskHour,
    string TimezoneId);

public record GetNotificationPreferenceQuery
    : IQuery<OneOf<NotificationPreferenceDto, NotFoundError>>, IAuthenticatedCommand;

public class GetNotificationPreferenceQueryHandler
    : IQueryHandler<GetNotificationPreferenceQuery, OneOf<NotificationPreferenceDto, NotFoundError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetNotificationPreferenceQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<NotificationPreferenceDto, NotFoundError>> Handle(
        GetNotificationPreferenceQuery query, CancellationToken ct)
    {
        var pref = await _uow.NotificationPreferences.GetByUserIdAsync(_currentUser.UserId, ct);
        if (pref is null)
        {
            // Return defaults for new users
            var defaults = new NotificationPreference { UserId = _currentUser.UserId };
            return ToDto(defaults);
        }
        return ToDto(pref);
    }

    private static NotificationPreferenceDto ToDto(NotificationPreference p) => new(
        p.WeeklyReviewEnabled, p.WeeklyReviewDayOfWeek, p.WeeklyReviewHour,
        p.GoalDeadlineEnabled, p.GoalDeadlineDaysBeforeList,
        p.HabitStreakRiskEnabled, p.HabitStreakRiskHour,
        p.TimezoneId);
}
