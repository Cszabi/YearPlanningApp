using FluentValidation;
using FluentValidation.Results;
using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.FlowSessions;

public record CompleteFlowSessionCommand(
    Guid SessionId,
    string Outcome,
    int FlowQualityRating,
    int EnergyAfterRating,
    string? Blockers)
    : ICommand<OneOf<FlowSessionDto, NotFoundError, ValidationError>>, IAuthenticatedCommand;

public class CompleteFlowSessionCommandValidator : AbstractValidator<CompleteFlowSessionCommand>
{
    public CompleteFlowSessionCommandValidator()
    {
        RuleFor(x => x.Outcome)
            .NotEmpty()
            .Must(v => Enum.TryParse<FlowSessionOutcome>(v, true, out _))
            .WithMessage("Outcome must be Fully, Partially, or NotReally.");
        RuleFor(x => x.FlowQualityRating).InclusiveBetween(1, 5);
        RuleFor(x => x.EnergyAfterRating).InclusiveBetween(1, 5);
    }
}

public class CompleteFlowSessionCommandHandler
    : ICommandHandler<CompleteFlowSessionCommand, OneOf<FlowSessionDto, NotFoundError, ValidationError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public CompleteFlowSessionCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<FlowSessionDto, NotFoundError, ValidationError>> Handle(
        CompleteFlowSessionCommand command, CancellationToken ct)
    {
        var session = await _uow.FlowSessions.GetByIdAsync(command.SessionId, ct);
        if (session is null || session.UserId != _currentUser.UserId)
            return new NotFoundError("FlowSession", command.SessionId);

        if (session.EndedAt.HasValue)
            return new ValidationError([new ValidationFailure("SessionId", "Session is already completed.")]);

        var now = DateTime.UtcNow;
        session.EndedAt = now;
        session.ActualMinutes = (int)Math.Round((now - session.StartedAt).TotalMinutes);
        session.Outcome = Enum.Parse<FlowSessionOutcome>(command.Outcome, true);
        session.FlowQualityRating = command.FlowQualityRating;
        session.EnergyAfterRating = command.EnergyAfterRating;
        session.Blockers = command.Blockers;
        session.UpdatedAt = now;

        await _uow.SaveChangesAsync(ct);
        return CreateFlowSessionCommandHandler.ToDto(session);
    }
}
