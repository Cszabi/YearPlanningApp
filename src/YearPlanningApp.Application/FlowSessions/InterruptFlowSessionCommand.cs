using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.FlowSessions;

public record InterruptFlowSessionCommand(
    Guid SessionId,
    string? InterruptionReason)
    : ICommand<OneOf<FlowSessionDto, NotFoundError>>, IAuthenticatedCommand;

public class InterruptFlowSessionCommandHandler
    : ICommandHandler<InterruptFlowSessionCommand, OneOf<FlowSessionDto, NotFoundError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public InterruptFlowSessionCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<FlowSessionDto, NotFoundError>> Handle(
        InterruptFlowSessionCommand command, CancellationToken ct)
    {
        var session = await _uow.FlowSessions.GetByIdAsync(command.SessionId, ct);
        if (session is null || session.UserId != _currentUser.UserId)
            return new NotFoundError("FlowSession", command.SessionId);

        var now = DateTime.UtcNow;
        session.EndedAt = now;
        session.ActualMinutes = (int)Math.Round((now - session.StartedAt).TotalMinutes);
        session.WasInterrupted = true;
        session.InterruptionReason = command.InterruptionReason;
        session.UpdatedAt = now;

        await _uow.SaveChangesAsync(ct);
        return CreateFlowSessionCommandHandler.ToDto(session);
    }
}
