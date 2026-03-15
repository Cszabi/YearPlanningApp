using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Goals;

public record CreateMilestoneCommand(
    Guid GoalId,
    int Year,
    string Title,
    DateTime? TargetDate,
    int OrderIndex)
    : ICommand<OneOf<MilestoneDto, NotFoundError>>, IAuthenticatedCommand;

public class CreateMilestoneCommandHandler
    : ICommandHandler<CreateMilestoneCommand, OneOf<MilestoneDto, NotFoundError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public CreateMilestoneCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<MilestoneDto, NotFoundError>> Handle(
        CreateMilestoneCommand command, CancellationToken ct)
    {
        var goal = await _uow.Goals.GetByIdWithMilestonesAsync(command.GoalId, ct);
        if (goal is null || goal.UserId != _currentUser.UserId || goal.Year != command.Year)
            return new NotFoundError("Goal", command.GoalId);

        var milestone = new Milestone
        {
            GoalId = command.GoalId,
            Title = command.Title,
            TargetDate = command.TargetDate.HasValue
                ? DateTime.SpecifyKind(command.TargetDate.Value, DateTimeKind.Utc)
                : null,
            OrderIndex = command.OrderIndex,
            IsComplete = false,
        };

        await _uow.Goals.AddMilestoneAsync(milestone, ct);
        await _uow.SaveChangesAsync(ct);

        return milestone.ToDto();
    }
}
