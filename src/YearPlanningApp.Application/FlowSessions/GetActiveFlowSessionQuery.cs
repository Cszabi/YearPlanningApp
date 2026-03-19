using Mediator;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.FlowSessions;

public record GetActiveFlowSessionQuery : IQuery<FlowSessionDto?>, IAuthenticatedCommand;

public class GetActiveFlowSessionQueryHandler
    : IQueryHandler<GetActiveFlowSessionQuery, FlowSessionDto?>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetActiveFlowSessionQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<FlowSessionDto?> Handle(GetActiveFlowSessionQuery query, CancellationToken ct)
    {
        var session = await _uow.FlowSessions.GetActiveSessionAsync(_currentUser.UserId, ct);
        if (session is null) return null;

        return new FlowSessionDto(
            session.Id,
            session.GoalId,
            session.TaskItemId,
            session.SessionIntention,
            session.PlannedMinutes,
            session.ActualMinutes,
            session.StartedAt,
            session.EndedAt,
            session.FlowQualityRating,
            session.EnergyAfterRating,
            session.Outcome?.ToString(),
            session.WasInterrupted,
            session.InterruptionReason,
            session.Blockers,
            session.AmbientSound.ToString(),
            session.EnergyLevel.ToString());
    }
}
