using FluentValidation;
using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Goals;

public record SaveWoopReflectionCommand(
    Guid GoalId,
    int Year,
    string Wish,
    string Outcome,
    string Obstacle,
    string Plan)
    : ICommand<OneOf<GoalDto, NotFoundError, ValidationError>>, IAuthenticatedCommand;

public class SaveWoopReflectionCommandValidator : AbstractValidator<SaveWoopReflectionCommand>
{
    public SaveWoopReflectionCommandValidator()
    {
        RuleFor(x => x.Wish).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.Outcome).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.Obstacle).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.Plan).NotEmpty().MaximumLength(1000);
    }
}

public class SaveWoopReflectionCommandHandler
    : ICommandHandler<SaveWoopReflectionCommand, OneOf<GoalDto, NotFoundError, ValidationError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public SaveWoopReflectionCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<GoalDto, NotFoundError, ValidationError>> Handle(
        SaveWoopReflectionCommand command, CancellationToken ct)
    {
        var goals = await _uow.Goals.GetByUserAndYearAsync(_currentUser.UserId, command.Year, ct);
        var goal = goals.FirstOrDefault(g => g.Id == command.GoalId);
        if (goal is null)
            return new NotFoundError("Goal", command.GoalId);

        if (goal.WoopReflection is null)
        {
            goal.WoopReflection = new WoopReflection
            {
                GoalId = goal.Id,
                Wish = command.Wish,
                Outcome = command.Outcome,
                Obstacle = command.Obstacle,
                Plan = command.Plan,
            };
        }
        else
        {
            goal.WoopReflection.Wish = command.Wish;
            goal.WoopReflection.Outcome = command.Outcome;
            goal.WoopReflection.Obstacle = command.Obstacle;
            goal.WoopReflection.Plan = command.Plan;
            goal.WoopReflection.UpdatedAt = DateTime.UtcNow;
        }

        _uow.Goals.Update(goal);
        await _uow.SaveChangesAsync(ct);

        return goal.ToDto();
    }
}
