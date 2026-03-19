using FluentValidation;
using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.FlowSessions;

public record CreateFlowSessionCommand(
    Guid? GoalId,
    Guid? TaskItemId,
    string? SessionIntention,
    int PlannedMinutes,
    string EnergyLevel,
    string AmbientSound)
    : ICommand<OneOf<FlowSessionDto, ValidationError>>, IAuthenticatedCommand;

public class CreateFlowSessionCommandValidator : AbstractValidator<CreateFlowSessionCommand>
{
    public CreateFlowSessionCommandValidator()
    {
        RuleFor(x => x.PlannedMinutes)
            .GreaterThan(0).WithMessage("PlannedMinutes must be greater than 0.")
            .LessThanOrEqualTo(720).WithMessage("PlannedMinutes must be 720 or less.");

        RuleFor(x => x.EnergyLevel)
            .NotEmpty()
            .Must(v => Enum.TryParse<EnergyLevel>(v, true, out _))
            .WithMessage("EnergyLevel must be Deep, Medium, or Shallow.");

        RuleFor(x => x.AmbientSound)
            .NotEmpty()
            .Must(v => Enum.TryParse<AmbientSoundMode>(v, true, out _))
            .WithMessage("AmbientSound must be None, BrownNoise, WhiteNoise, or Nature.");
    }
}

public class CreateFlowSessionCommandHandler
    : ICommandHandler<CreateFlowSessionCommand, OneOf<FlowSessionDto, ValidationError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public CreateFlowSessionCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<FlowSessionDto, ValidationError>> Handle(
        CreateFlowSessionCommand command, CancellationToken ct)
    {
        var session = new FlowSession
        {
            UserId = _currentUser.UserId,
            GoalId = command.GoalId,
            TaskItemId = command.TaskItemId,
            SessionIntention = command.SessionIntention,
            PlannedMinutes = command.PlannedMinutes,
            StartedAt = DateTime.UtcNow,
            EnergyLevel = Enum.Parse<EnergyLevel>(command.EnergyLevel, true),
            AmbientSound = Enum.Parse<AmbientSoundMode>(command.AmbientSound, true),
        };

        await _uow.FlowSessions.AddAsync(session, ct);
        await _uow.SaveChangesAsync(ct);

        return ToDto(session);
    }

    internal static FlowSessionDto ToDto(FlowSession s) => new(
        s.Id,
        s.GoalId,
        s.TaskItemId,
        s.SessionIntention,
        s.PlannedMinutes,
        s.ActualMinutes,
        s.StartedAt,
        s.EndedAt,
        s.FlowQualityRating,
        s.EnergyAfterRating,
        s.Outcome?.ToString(),
        s.WasInterrupted,
        s.InterruptionReason,
        s.Blockers,
        s.AmbientSound.ToString(),
        s.EnergyLevel.ToString());
}
