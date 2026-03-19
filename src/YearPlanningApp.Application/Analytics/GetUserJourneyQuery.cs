using Mediator;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Analytics;

public record GetUserJourneyQuery(
    Guid UserId,
    DateTimeOffset FromDate,
    DateTimeOffset ToDate
) : IQuery<IReadOnlyList<PageSessionDto>>;

public class GetUserJourneyQueryHandler
    : IQueryHandler<GetUserJourneyQuery, IReadOnlyList<PageSessionDto>>
{
    private readonly IUnitOfWork _uow;

    public GetUserJourneyQueryHandler(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async ValueTask<IReadOnlyList<PageSessionDto>> Handle(
        GetUserJourneyQuery query, CancellationToken ct)
    {
        var sessions = (await _uow.PageSessions.GetByUserAndDateRangeAsync(
            query.UserId, query.FromDate, query.ToDate, ct))
            .OrderBy(s => s.SessionStart)
            .ToList();

        var sessionIds = sessions.Select(s => s.Id).ToList();
        var allActions = (await _uow.UserActions.GetBySessionIdsAsync(sessionIds, ct)).ToList();

        var actionsBySession = allActions
            .GroupBy(a => a.PageSessionId)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<UserActionDto>)g.Select(a => a.ToDto()).ToList().AsReadOnly());

        return sessions
            .Select(s => s.ToDto(
                actionsBySession.TryGetValue(s.Id, out var acts) ? acts : null))
            .ToList()
            .AsReadOnly();
    }
}
