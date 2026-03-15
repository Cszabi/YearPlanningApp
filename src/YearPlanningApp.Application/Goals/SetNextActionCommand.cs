using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Goals;

public record SetNextActionCommand(Guid TaskId, bool IsNextAction)
    : ICommand<OneOf<TaskDto, NotFoundError>>, IAuthenticatedCommand;

public class SetNextActionCommandHandler
    : ICommandHandler<SetNextActionCommand, OneOf<TaskDto, NotFoundError>>
{
    private readonly IUnitOfWork _uow;

    public SetNextActionCommandHandler(IUnitOfWork uow) => _uow = uow;

    public async ValueTask<OneOf<TaskDto, NotFoundError>> Handle(
        SetNextActionCommand command, CancellationToken ct)
    {
        var task = await _uow.Tasks.GetByIdAsync(command.TaskId, ct);
        if (task is null)
            return new NotFoundError("TaskItem", command.TaskId);

        if (command.IsNextAction)
            await _uow.Tasks.ClearNextActionForGoalAsync(task.GoalId, ct);

        task.IsNextAction = command.IsNextAction;
        task.UpdatedAt = DateTime.UtcNow;
        _uow.Tasks.Update(task);
        await _uow.SaveChangesAsync(ct);

        return task.ToDto();
    }
}
