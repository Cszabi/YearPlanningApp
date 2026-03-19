using Mediator;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.FlowSessions;

public record FlowInsightsDto(
    int WeekSessionCount,
    int WeekTotalMinutes,
    double? WeekAvgFlowQuality,
    int? BestHour);

public record GetFlowInsightsQuery : IQuery<FlowInsightsDto>, IAuthenticatedCommand;

public class GetFlowInsightsQueryHandler
    : IQueryHandler<GetFlowInsightsQuery, FlowInsightsDto>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetFlowInsightsQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<FlowInsightsDto> Handle(GetFlowInsightsQuery query, CancellationToken ct)
    {
        var now   = DateTime.UtcNow;
        var dayOfWeek = (int)now.DayOfWeek;
        var daysToMonday = dayOfWeek == 0 ? 6 : dayOfWeek - 1;
        var weekStart = now.Date.AddDays(-daysToMonday);
        var weekEnd   = weekStart.AddDays(7);

        var sessions = (await _uow.FlowSessions.GetSessionsByDateRangeAsync(
            _currentUser.UserId, weekStart, weekEnd, ct)).ToList();

        var count   = sessions.Count;
        var minutes = sessions.Sum(s => s.ActualMinutes ?? s.PlannedMinutes);
        var withQuality = sessions.Where(s => s.FlowQualityRating.HasValue).ToList();
        double? avgQuality = withQuality.Count > 0
            ? withQuality.Average(s => s.FlowQualityRating!.Value)
            : null;

        // Best hour: the starting hour that appears most often across all sessions
        int? bestHour = null;
        if (sessions.Count > 0)
        {
            bestHour = sessions
                .GroupBy(s => s.StartedAt.Hour)
                .OrderByDescending(g => g.Count())
                .First().Key;
        }

        return new FlowInsightsDto(count, minutes, avgQuality, bestHour);
    }
}
