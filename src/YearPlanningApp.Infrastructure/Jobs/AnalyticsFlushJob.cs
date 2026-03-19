using Microsoft.Extensions.Logging;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Infrastructure.Jobs;

public class AnalyticsFlushJob
{
    private readonly IAnalyticsBuffer _buffer;
    private readonly IUnitOfWork _uow;
    private readonly ILogger<AnalyticsFlushJob> _logger;

    public AnalyticsFlushJob(IAnalyticsBuffer buffer, IUnitOfWork uow, ILogger<AnalyticsFlushJob> logger)
    {
        _buffer = buffer;
        _uow = uow;
        _logger = logger;
    }

    public async Task ExecuteAsync(CancellationToken ct = default)
    {
        if (!_buffer.IsAvailable)
        {
            _logger.LogDebug("Analytics buffer is unavailable; skipping flush.");
            return;
        }

        var actions = await _buffer.DequeueAllAsync(ct);
        if (actions.Count == 0) return;

        await _uow.UserActions.AddBatchAsync(actions, ct);
        await _uow.SaveChangesAsync(ct);

        _logger.LogInformation("Analytics flush: persisted {Count} buffered actions.", actions.Count);
    }
}
