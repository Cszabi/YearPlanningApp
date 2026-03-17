using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Goals;

public record DeleteMilestoneCommand(Guid MilestoneId)
    : ICommand<OneOf<SuccessResult, NotFoundError>>, IAuthenticatedCommand;

public class DeleteMilestoneCommandHandler
    : ICommandHandler<DeleteMilestoneCommand, OneOf<SuccessResult, NotFoundError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public DeleteMilestoneCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<SuccessResult, NotFoundError>> Handle(
        DeleteMilestoneCommand command, CancellationToken ct)
    {
        var milestone = await _uow.Goals.GetMilestoneWithGoalAsync(command.MilestoneId, ct);
        if (milestone is null || milestone.Goal.UserId != _currentUser.UserId)
            return new NotFoundError("Milestone", command.MilestoneId);

        _uow.Goals.RemoveMilestone(milestone);
        await _uow.SaveChangesAsync(ct);

        return new SuccessResult();
    }
}
