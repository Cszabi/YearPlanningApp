using System.Text.Json;
using FluentValidation;
using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Goals;

public record CreateGoalCommand(
    int Year,
    string Title,
    GoalType GoalType,
    LifeArea LifeArea,
    EnergyLevel EnergyLevel,
    string? WhyItMatters,
    DateTime? TargetDate,
    string[] AlignedValueNames)
    : ICommand<OneOf<GoalDto, ValidationError, ConflictError>>, IAuthenticatedCommand;

public class CreateGoalCommandValidator : AbstractValidator<CreateGoalCommand>
{
    public CreateGoalCommandValidator()
    {
        RuleFor(x => x.Year).InclusiveBetween(2020, 2100);
        RuleFor(x => x.Title).NotEmpty().MaximumLength(300);
    }
}

public class CreateGoalCommandHandler
    : ICommandHandler<CreateGoalCommand, OneOf<GoalDto, ValidationError, ConflictError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public CreateGoalCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<GoalDto, ValidationError, ConflictError>> Handle(
        CreateGoalCommand command, CancellationToken ct)
    {
        if (command.EnergyLevel == EnergyLevel.Deep)
        {
            var deepCount = await _uow.Goals.CountActiveDeepWorkGoalsAsync(
                _currentUser.UserId, command.Year, ct);
            if (deepCount >= 3)
                return new ConflictError(
                    "You already have 3 active Deep Work goals. Pause or complete one before adding another.");
        }

        var goal = new Goal
        {
            UserId = _currentUser.UserId,
            Year = command.Year,
            Title = command.Title,
            GoalType = command.GoalType,
            Status = GoalStatus.Active,
            LifeArea = command.LifeArea,
            EnergyLevel = command.EnergyLevel,
            WhyItMatters = command.WhyItMatters,
            TargetDate = command.TargetDate,
            AlignedValueNames = JsonSerializer.Serialize(command.AlignedValueNames),
        };

        await _uow.Goals.AddAsync(goal, ct);
        await _uow.SaveChangesAsync(ct);

        return goal.ToDto();
    }
}
