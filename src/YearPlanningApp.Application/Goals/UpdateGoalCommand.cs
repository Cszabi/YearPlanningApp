using System.Text.Json;
using FluentValidation;
using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Goals;

public record UpdateGoalCommand(
    Guid GoalId,
    int Year,
    string? Title,
    string? WhyItMatters,
    DateTime? TargetDate,
    LifeArea? LifeArea,
    EnergyLevel? EnergyLevel,
    string[]? AlignedValueNames)
    : ICommand<OneOf<GoalDto, NotFoundError, ValidationError>>, IAuthenticatedCommand;

public class UpdateGoalCommandValidator : AbstractValidator<UpdateGoalCommand>
{
    public UpdateGoalCommandValidator()
    {
        RuleFor(x => x.Title).MaximumLength(300).When(x => x.Title is not null);
    }
}

public class UpdateGoalCommandHandler
    : ICommandHandler<UpdateGoalCommand, OneOf<GoalDto, NotFoundError, ValidationError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public UpdateGoalCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<GoalDto, NotFoundError, ValidationError>> Handle(
        UpdateGoalCommand command, CancellationToken ct)
    {
        var goal = await _uow.Goals.GetByIdAsync(command.GoalId, ct);
        if (goal is null || goal.UserId != _currentUser.UserId || goal.Year != command.Year)
            return new NotFoundError("Goal", command.GoalId);

        if (command.Title is not null) goal.Title = command.Title;
        if (command.WhyItMatters is not null) goal.WhyItMatters = command.WhyItMatters;
        if (command.TargetDate.HasValue) goal.TargetDate = command.TargetDate;
        if (command.LifeArea.HasValue) goal.LifeArea = command.LifeArea.Value;
        if (command.EnergyLevel.HasValue) goal.EnergyLevel = command.EnergyLevel.Value;
        if (command.AlignedValueNames is not null)
            goal.AlignedValueNames = JsonSerializer.Serialize(command.AlignedValueNames);

        _uow.Goals.Update(goal);
        await _uow.SaveChangesAsync(ct);

        return goal.ToDto();
    }
}
