using FluentValidation;
using FluentValidation.Results;
using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Goals;

public record UpdateGoalProgressCommand(Guid GoalId, int ProgressPercent)
    : ICommand<OneOf<GoalDto, NotFoundError, ValidationError>>, IAuthenticatedCommand;

public class UpdateGoalProgressCommandValidator : AbstractValidator<UpdateGoalProgressCommand>
{
    public UpdateGoalProgressCommandValidator()
    {
        RuleFor(x => x.ProgressPercent)
            .InclusiveBetween(0, 100)
            .WithMessage("ProgressPercent must be between 0 and 100.");
    }
}

public class UpdateGoalProgressCommandHandler
    : ICommandHandler<UpdateGoalProgressCommand, OneOf<GoalDto, NotFoundError, ValidationError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public UpdateGoalProgressCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<GoalDto, NotFoundError, ValidationError>> Handle(
        UpdateGoalProgressCommand command, CancellationToken ct)
    {
        var goal = await _uow.Goals.GetByIdAsync(command.GoalId, ct);
        if (goal is null || goal.UserId != _currentUser.UserId)
            return new NotFoundError("Goal", command.GoalId);

        if (goal.GoalType != GoalType.Project)
            return new ValidationError([new ValidationFailure("GoalType", "ProgressPercent can only be set on Project goals.")]);

        var prev = goal.ProgressPercent;
        goal.ProgressPercent = command.ProgressPercent;
        goal.UpdatedAt = DateTime.UtcNow;

        if (command.ProgressPercent == 100 && prev < 100)
        {
            goal.Status = GoalStatus.Achieved;
            goal.CompletedAt = DateTime.UtcNow;
        }
        else if (command.ProgressPercent < 100 && prev == 100)
        {
            goal.Status = GoalStatus.Active;
            goal.CompletedAt = null;
        }

        _uow.Goals.Update(goal);
        await _uow.GoalProgressSnapshots.UpsertTodayAsync(goal.Id, _currentUser.UserId, command.ProgressPercent, ct);
        await _uow.SaveChangesAsync(ct);

        return goal.ToDto();
    }
}
