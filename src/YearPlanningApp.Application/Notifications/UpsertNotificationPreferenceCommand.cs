using FluentValidation;
using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Notifications;

public record UpsertNotificationPreferenceCommand(
    bool WeeklyReviewEnabled,
    DayOfWeek WeeklyReviewDayOfWeek,
    int WeeklyReviewHour,
    bool GoalDeadlineEnabled,
    string GoalDeadlineDaysBeforeList,
    bool HabitStreakRiskEnabled,
    int HabitStreakRiskHour,
    string TimezoneId)
    : ICommand<OneOf<SuccessResult, ValidationError>>, IAuthenticatedCommand;

public class UpsertNotificationPreferenceCommandValidator
    : AbstractValidator<UpsertNotificationPreferenceCommand>
{
    public UpsertNotificationPreferenceCommandValidator()
    {
        RuleFor(x => x.WeeklyReviewHour).InclusiveBetween(0, 23);
        RuleFor(x => x.HabitStreakRiskHour).InclusiveBetween(0, 23);
        RuleFor(x => x.TimezoneId).NotEmpty().MaximumLength(100);
        RuleFor(x => x.GoalDeadlineDaysBeforeList).NotEmpty();
    }
}

public class UpsertNotificationPreferenceCommandHandler
    : ICommandHandler<UpsertNotificationPreferenceCommand, OneOf<SuccessResult, ValidationError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public UpsertNotificationPreferenceCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<SuccessResult, ValidationError>> Handle(
        UpsertNotificationPreferenceCommand command, CancellationToken ct)
    {
        var pref = new NotificationPreference
        {
            UserId = _currentUser.UserId,
            WeeklyReviewEnabled = command.WeeklyReviewEnabled,
            WeeklyReviewDayOfWeek = command.WeeklyReviewDayOfWeek,
            WeeklyReviewHour = command.WeeklyReviewHour,
            GoalDeadlineEnabled = command.GoalDeadlineEnabled,
            GoalDeadlineDaysBeforeList = command.GoalDeadlineDaysBeforeList,
            HabitStreakRiskEnabled = command.HabitStreakRiskEnabled,
            HabitStreakRiskHour = command.HabitStreakRiskHour,
            TimezoneId = command.TimezoneId,
        };

        await _uow.NotificationPreferences.UpsertAsync(pref, ct);
        await _uow.SaveChangesAsync(ct);
        return new SuccessResult();
    }
}
