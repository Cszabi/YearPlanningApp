using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Goals;

public record DeleteHabitCommand(Guid HabitId)
    : ICommand<OneOf<SuccessResult, NotFoundError>>, IAuthenticatedCommand;

public class DeleteHabitCommandHandler
    : ICommandHandler<DeleteHabitCommand, OneOf<SuccessResult, NotFoundError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public DeleteHabitCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<SuccessResult, NotFoundError>> Handle(
        DeleteHabitCommand command, CancellationToken ct)
    {
        var habit = await _uow.Habits.GetByIdAsync(command.HabitId, ct);
        if (habit is null || habit.UserId != _currentUser.UserId)
            return new NotFoundError("Habit", command.HabitId);

        _uow.Habits.Remove(habit);
        await _uow.SaveChangesAsync(ct);

        return new SuccessResult();
    }
}
