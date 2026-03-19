using Mediator;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.FlowSessions;

public record FlowSessionDto(
    Guid Id,
    Guid? GoalId,
    Guid? TaskItemId,
    string? SessionIntention,
    int PlannedMinutes,
    int? ActualMinutes,
    DateTime StartedAt,
    DateTime? EndedAt,
    int? FlowQualityRating,
    int? EnergyAfterRating,
    string? Outcome,
    bool WasInterrupted,
    string? InterruptionReason,
    string? Blockers,
    string AmbientSound,
    string EnergyLevel);

public record GetFlowSessionsQuery(int Year)
    : IQuery<IEnumerable<FlowSessionDto>>, IAuthenticatedCommand;

public class GetFlowSessionsQueryHandler
    : IQueryHandler<GetFlowSessionsQuery, IEnumerable<FlowSessionDto>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetFlowSessionsQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<IEnumerable<FlowSessionDto>> Handle(GetFlowSessionsQuery query, CancellationToken ct)
    {
        var from = new DateTime(query.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var to   = new DateTime(query.Year, 12, 31, 23, 59, 59, DateTimeKind.Utc);

        var sessions = await _uow.FlowSessions.GetSessionsByDateRangeAsync(
            _currentUser.UserId, from, to, ct);

        return sessions.Select(s => new FlowSessionDto(
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
            s.EnergyLevel.ToString()
        )).ToList();
    }
}
