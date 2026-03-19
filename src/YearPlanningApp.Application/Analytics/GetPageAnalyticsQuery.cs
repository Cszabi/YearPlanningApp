using Mediator;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Analytics;

public record GetPageAnalyticsQuery(
    string Page,
    DateTimeOffset FromDate,
    DateTimeOffset ToDate
) : IQuery<PageAnalyticsDto>;

public class GetPageAnalyticsQueryHandler : IQueryHandler<GetPageAnalyticsQuery, PageAnalyticsDto>
{
    private readonly IUnitOfWork _uow;

    public GetPageAnalyticsQueryHandler(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async ValueTask<PageAnalyticsDto> Handle(GetPageAnalyticsQuery query, CancellationToken ct)
    {
        var sessions = (await _uow.PageSessions.GetByPageAndDateRangeAsync(
            query.Page, query.FromDate, query.ToDate, ct)).ToList();

        var durations = sessions
            .Where(s => s.DurationSeconds.HasValue)
            .Select(s => s.DurationSeconds!.Value)
            .ToList();

        double avg = durations.Count > 0 ? durations.Average() : 0;
        double median = ComputeMedian(durations);
        int total = sessions.Count;
        int uniqueUsers = sessions.Select(s => s.UserId).Distinct().Count();
        double dropOffRate = total > 0
            ? (double)sessions.Count(s => s.DurationSeconds.HasValue && s.DurationSeconds.Value < 10)
              / total * 100
            : 0;

        var sessionIds = sessions.Select(s => s.Id).ToList();
        var actions = (await _uow.UserActions.GetBySessionIdsAsync(sessionIds, ct)).ToList();

        var topActions = actions
            .GroupBy(a => a.ActionType)
            .Select(g => new ActionSummaryDto(
                g.Key,
                g.Count(),
                total > 0 ? (double)g.Count() / total * 100 : 0))
            .OrderByDescending(a => a.Count)
            .ToList()
            .AsReadOnly();

        var buckets = BuildDurationBuckets(durations).AsReadOnly();

        return new PageAnalyticsDto(
            query.Page, avg, median, total, uniqueUsers, dropOffRate,
            topActions, buckets);
    }

    private static double ComputeMedian(List<int> values)
    {
        if (values.Count == 0) return 0;
        var sorted = values.OrderBy(v => v).ToList();
        int mid = sorted.Count / 2;
        return sorted.Count % 2 == 0
            ? (sorted[mid - 1] + sorted[mid]) / 2.0
            : sorted[mid];
    }

    private static List<DurationBucketDto> BuildDurationBuckets(List<int> durations) =>
    [
        new("0–10s",  durations.Count(d => d < 10)),
        new("10–30s", durations.Count(d => d >= 10  && d < 30)),
        new("30s–2m", durations.Count(d => d >= 30  && d < 120)),
        new("2–5m",   durations.Count(d => d >= 120 && d < 300)),
        new("5–15m",  durations.Count(d => d >= 300 && d < 900)),
        new("15m+",   durations.Count(d => d >= 900)),
    ];
}
