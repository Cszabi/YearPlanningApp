using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Goals;

public record UpdateTaskStatusCommand(Guid TaskId, TaskItemStatus Status)
    : ICommand<OneOf<TaskDto, NotFoundError>>, IAuthenticatedCommand;

public class UpdateTaskStatusCommandHandler
    : ICommandHandler<UpdateTaskStatusCommand, OneOf<TaskDto, NotFoundError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public UpdateTaskStatusCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<TaskDto, NotFoundError>> Handle(
        UpdateTaskStatusCommand command, CancellationToken ct)
    {
        var task = await _uow.Tasks.GetByIdAsync(command.TaskId, ct);
        if (task is null)
            return new NotFoundError("TaskItem", command.TaskId);

        task.Status = command.Status;
        _uow.Tasks.Update(task);
        await _uow.SaveChangesAsync(ct);

        return task.ToDto();
    }
}
