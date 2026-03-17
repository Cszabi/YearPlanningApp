using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Goals;

public record DeleteTaskCommand(Guid TaskId)
    : ICommand<OneOf<SuccessResult, NotFoundError>>, IAuthenticatedCommand;

public class DeleteTaskCommandHandler
    : ICommandHandler<DeleteTaskCommand, OneOf<SuccessResult, NotFoundError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public DeleteTaskCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<SuccessResult, NotFoundError>> Handle(
        DeleteTaskCommand command, CancellationToken ct)
    {
        var task = await _uow.Tasks.GetByIdAsync(command.TaskId, ct);
        if (task is null)
            return new NotFoundError("Task", command.TaskId);

        var goal = await _uow.Goals.GetByIdAsync(task.GoalId, ct);
        if (goal is null || goal.UserId != _currentUser.UserId)
            return new NotFoundError("Task", command.TaskId);

        _uow.Tasks.Remove(task);
        await _uow.SaveChangesAsync(ct);

        return new SuccessResult();
    }
}
