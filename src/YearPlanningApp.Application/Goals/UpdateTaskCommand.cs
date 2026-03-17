using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Goals;

public record UpdateTaskCommand(
    Guid TaskId,
    string? Title,
    DateTime? DueDate,
    bool? IsNextAction,
    string? Status)
    : ICommand<OneOf<TaskDto, NotFoundError>>, IAuthenticatedCommand;

public class UpdateTaskCommandHandler
    : ICommandHandler<UpdateTaskCommand, OneOf<TaskDto, NotFoundError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public UpdateTaskCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<TaskDto, NotFoundError>> Handle(
        UpdateTaskCommand command, CancellationToken ct)
    {
        var task = await _uow.Tasks.GetByIdAsync(command.TaskId, ct);
        if (task is null)
            return new NotFoundError("Task", command.TaskId);

        var goal = await _uow.Goals.GetByIdAsync(task.GoalId, ct);
        if (goal is null || goal.UserId != _currentUser.UserId)
            return new NotFoundError("Task", command.TaskId);

        if (command.Title is not null) task.Title = command.Title;
        if (command.DueDate.HasValue)
            task.DueDate = DateTime.SpecifyKind(command.DueDate.Value, DateTimeKind.Utc);
        if (command.IsNextAction.HasValue) task.IsNextAction = command.IsNextAction.Value;
        if (command.Status is not null && Enum.TryParse<TaskItemStatus>(command.Status, true, out var status))
            task.Status = status;

        _uow.Tasks.Update(task);
        await _uow.SaveChangesAsync(ct);

        return task.ToDto();
    }
}
