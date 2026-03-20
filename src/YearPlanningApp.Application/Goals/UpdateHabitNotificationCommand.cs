using FluentValidation;
using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Goals;

public record UpdateHabitNotificationCommand(
    Guid HabitId,
    bool NotificationEnabled,
    int? ReminderHour,
    int? ReminderMinute)
    : ICommand<OneOf<HabitDto, ValidationError, NotFoundError>>, IAuthenticatedCommand;

public class UpdateHabitNotificationCommandValidator : AbstractValidator<UpdateHabitNotificationCommand>
{
    public UpdateHabitNotificationCommandValidator()
    {
        When(x => x.NotificationEnabled, () => {
            RuleFor(x => x.ReminderHour)
                .NotNull().WithMessage("ReminderHour is required when notifications are enabled.")
                .InclusiveBetween(0, 23).WithMessage("ReminderHour must be 0–23.");
            RuleFor(x => x.ReminderMinute)
                .NotNull().WithMessage("ReminderMinute is required when notifications are enabled.")
                .InclusiveBetween(0, 59).WithMessage("ReminderMinute must be 0–59.");
        });
    }
}

public class UpdateHabitNotificationCommandHandler
    : ICommandHandler<UpdateHabitNotificationCommand, OneOf<HabitDto, ValidationError, NotFoundError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public UpdateHabitNotificationCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<HabitDto, ValidationError, NotFoundError>> Handle(
        UpdateHabitNotificationCommand command, CancellationToken ct)
    {
        var habit = await _uow.Habits.GetByIdAsync(command.HabitId, ct);
        if (habit is null || habit.UserId != _currentUser.UserId)
            return new NotFoundError("Habit", command.HabitId);

        habit.NotificationEnabled = command.NotificationEnabled;
        habit.ReminderHour = command.NotificationEnabled ? command.ReminderHour : null;
        habit.ReminderMinute = command.NotificationEnabled ? command.ReminderMinute : null;

        _uow.Habits.Update(habit);
        await _uow.SaveChangesAsync(ct);

        return habit.ToDto();
    }
}
