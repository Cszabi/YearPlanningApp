using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Goals;

public record UpdateGoalStatusCommand(Guid GoalId, int Year, GoalStatus Status)
    : ICommand<OneOf<GoalDto, NotFoundError>>, IAuthenticatedCommand;

public class UpdateGoalStatusCommandHandler
    : ICommandHandler<UpdateGoalStatusCommand, OneOf<GoalDto, NotFoundError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public UpdateGoalStatusCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<GoalDto, NotFoundError>> Handle(
        UpdateGoalStatusCommand command, CancellationToken ct)
    {
        var goal = await _uow.Goals.GetByIdAsync(command.GoalId, ct);
        if (goal is null || goal.UserId != _currentUser.UserId || goal.Year != command.Year)
            return new NotFoundError("Goal", command.GoalId);

        goal.Status = command.Status;
        _uow.Goals.Update(goal);
        await _uow.SaveChangesAsync(ct);

        return goal.ToDto();
    }
}
