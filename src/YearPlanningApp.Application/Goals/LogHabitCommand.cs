using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Goals;

public record LogHabitCommand(Guid HabitId, string? Notes, int? DurationMinutes)
    : ICommand<OneOf<HabitDto, NotFoundError>>, IAuthenticatedCommand;

public class LogHabitCommandHandler
    : ICommandHandler<LogHabitCommand, OneOf<HabitDto, NotFoundError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public LogHabitCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<HabitDto, NotFoundError>> Handle(
        LogHabitCommand command, CancellationToken ct)
    {
        var habit = await _uow.Habits.GetByIdAsync(command.HabitId, ct);
        if (habit is null || habit.UserId != _currentUser.UserId)
            return new NotFoundError("Habit", command.HabitId);

        var today = DateTime.UtcNow.Date;
        var logs = await _uow.Habits.GetLogsByHabitAndDateRangeAsync(
            command.HabitId, today.AddDays(-1), today, ct);

        var lastLog = logs.OrderByDescending(l => l.LoggedDate).FirstOrDefault();
        var alreadyLoggedToday = lastLog?.LoggedDate.Date == today;

        if (!alreadyLoggedToday)
        {
            var log = new HabitLog
            {
                HabitId = command.HabitId,
                LoggedDate = DateTime.UtcNow,
                Notes = command.Notes,
                DurationMinutes = command.DurationMinutes,
            };
            await _uow.Habits.AddLogAsync(log, ct);

            // Update streak
            var loggedYesterday = lastLog?.LoggedDate.Date == today.AddDays(-1);
            habit.CurrentStreak = loggedYesterday ? habit.CurrentStreak + 1 : 1;
            if (habit.CurrentStreak > habit.LongestStreak)
                habit.LongestStreak = habit.CurrentStreak;

            _uow.Habits.Update(habit);
        }

        await _uow.SaveChangesAsync(ct);

        return habit.ToDto();
    }
}
