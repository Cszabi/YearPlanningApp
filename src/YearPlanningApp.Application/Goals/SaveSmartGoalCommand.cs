using FluentValidation;
using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Goals;

public record SaveSmartGoalCommand(
    Guid GoalId,
    int Year,
    string Specific,
    string Measurable,
    string Achievable,
    string Relevant,
    DateTime TimeBound)
    : ICommand<OneOf<GoalDto, NotFoundError, ValidationError>>, IAuthenticatedCommand;

public class SaveSmartGoalCommandValidator : AbstractValidator<SaveSmartGoalCommand>
{
    public SaveSmartGoalCommandValidator()
    {
        RuleFor(x => x.Specific).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.Measurable).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.Achievable).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.Relevant).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.TimeBound).GreaterThan(DateTime.UtcNow);
    }
}

public class SaveSmartGoalCommandHandler
    : ICommandHandler<SaveSmartGoalCommand, OneOf<GoalDto, NotFoundError, ValidationError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public SaveSmartGoalCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<GoalDto, NotFoundError, ValidationError>> Handle(
        SaveSmartGoalCommand command, CancellationToken ct)
    {
        var goals = await _uow.Goals.GetByUserAndYearAsync(_currentUser.UserId, command.Year, ct);
        var goal = goals.FirstOrDefault(g => g.Id == command.GoalId);
        if (goal is null)
            return new NotFoundError("Goal", command.GoalId);

        if (goal.SmartGoal is null)
        {
            goal.SmartGoal = new SmartGoal
            {
                GoalId = goal.Id,
                Specific = command.Specific,
                Measurable = command.Measurable,
                Achievable = command.Achievable,
                Relevant = command.Relevant,
                TimeBound = command.TimeBound,
            };
        }
        else
        {
            goal.SmartGoal.Specific = command.Specific;
            goal.SmartGoal.Measurable = command.Measurable;
            goal.SmartGoal.Achievable = command.Achievable;
            goal.SmartGoal.Relevant = command.Relevant;
            goal.SmartGoal.TimeBound = command.TimeBound;
            goal.SmartGoal.UpdatedAt = DateTime.UtcNow;
        }

        _uow.Goals.Update(goal);
        await _uow.SaveChangesAsync(ct);

        return goal.ToDto();
    }
}
