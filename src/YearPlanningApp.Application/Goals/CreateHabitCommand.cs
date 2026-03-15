using FluentValidation;
using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Goals;

public record CreateHabitCommand(
    Guid GoalId,
    int Year,
    string Title,
    HabitFrequency Frequency,
    string MinimumViableDose,
    string? IdealDose,
    string? Trigger,
    string? CelebrationRitual,
    HabitTrackingMethod TrackingMethod)
    : ICommand<OneOf<HabitDto, NotFoundError, ValidationError>>, IAuthenticatedCommand;

public class CreateHabitCommandValidator : AbstractValidator<CreateHabitCommand>
{
    public CreateHabitCommandValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(300);
        RuleFor(x => x.MinimumViableDose).NotEmpty().MaximumLength(500);
    }
}

public class CreateHabitCommandHandler
    : ICommandHandler<CreateHabitCommand, OneOf<HabitDto, NotFoundError, ValidationError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public CreateHabitCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<HabitDto, NotFoundError, ValidationError>> Handle(
        CreateHabitCommand command, CancellationToken ct)
    {
        var goal = await _uow.Goals.GetByIdAsync(command.GoalId, ct);
        if (goal is null || goal.UserId != _currentUser.UserId || goal.Year != command.Year)
            return new NotFoundError("Goal", command.GoalId);

        var habit = new Habit
        {
            UserId = _currentUser.UserId,
            GoalId = command.GoalId,
            Title = command.Title,
            Frequency = command.Frequency,
            MinimumViableDose = command.MinimumViableDose,
            IdealDose = command.IdealDose,
            Trigger = command.Trigger,
            CelebrationRitual = command.CelebrationRitual,
            TrackingMethod = command.TrackingMethod,
            CurrentStreak = 0,
            LongestStreak = 0,
        };

        await _uow.Habits.AddAsync(habit, ct);
        await _uow.SaveChangesAsync(ct);

        return habit.ToDto();
    }
}
