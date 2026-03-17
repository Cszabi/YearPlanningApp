using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Goals;

public record UpdateMilestoneCommand(
    Guid MilestoneId,
    string? Title,
    DateTime? TargetDate,
    bool? IsComplete)
    : ICommand<OneOf<MilestoneDto, NotFoundError>>, IAuthenticatedCommand;

public class UpdateMilestoneCommandHandler
    : ICommandHandler<UpdateMilestoneCommand, OneOf<MilestoneDto, NotFoundError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public UpdateMilestoneCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<MilestoneDto, NotFoundError>> Handle(
        UpdateMilestoneCommand command, CancellationToken ct)
    {
        var milestone = await _uow.Goals.GetMilestoneWithGoalAsync(command.MilestoneId, ct);
        if (milestone is null || milestone.Goal.UserId != _currentUser.UserId)
            return new NotFoundError("Milestone", command.MilestoneId);

        if (command.Title is not null) milestone.Title = command.Title;
        if (command.TargetDate.HasValue)
            milestone.TargetDate = DateTime.SpecifyKind(command.TargetDate.Value, DateTimeKind.Utc);
        if (command.IsComplete.HasValue) milestone.IsComplete = command.IsComplete.Value;

        _uow.Goals.UpdateMilestone(milestone);
        await _uow.SaveChangesAsync(ct);

        return milestone.ToDto();
    }
}
