using System.Text.Json;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Entities;

namespace YearPlanningApp.Infrastructure.Services;

public class AnalyticsBufferService : IAnalyticsBuffer
{
    private const string RedisKey = "analytics:action_buffer";
    private readonly IConnectionMultiplexer? _redis;
    private readonly ILogger<AnalyticsBufferService> _logger;

    public AnalyticsBufferService(IConnectionMultiplexer? redis, ILogger<AnalyticsBufferService> logger)
    {
        _redis = redis;
        _logger = logger;
    }

    public bool IsAvailable
    {
        get
        {
            try { return _redis?.IsConnected == true; }
            catch { return false; }
        }
    }

    public async Task BufferActionAsync(UserAction action, CancellationToken ct = default)
    {
        var db = _redis!.GetDatabase();
        var json = JsonSerializer.Serialize(new BufferedAction(
            action.Id, action.UserId, action.PageSessionId, action.Page,
            action.ActionType, action.ActionLabel, action.OccurredAt,
            action.Metadata, action.CreatedAt));
        await db.ListRightPushAsync(RedisKey, json);
    }

    public async Task<IReadOnlyList<UserAction>> DequeueAllAsync(CancellationToken ct = default)
    {
        var db = _redis!.GetDatabase();
        var length = await db.ListLengthAsync(RedisKey);
        if (length == 0) return Array.Empty<UserAction>();

        // Atomically read the first `length` items and trim them off the list
        var items = await db.ListRangeAsync(RedisKey, 0, length - 1);
        await db.ListTrimAsync(RedisKey, length, -1);

        var result = new List<UserAction>();
        foreach (var item in items)
        {
            try
            {
                var buffered = JsonSerializer.Deserialize<BufferedAction>(item!);
                if (buffered is null) continue;
                result.Add(new UserAction
                {
                    Id = buffered.Id,
                    UserId = buffered.UserId,
                    PageSessionId = buffered.PageSessionId,
                    Page = buffered.Page,
                    ActionType = buffered.ActionType,
                    ActionLabel = buffered.ActionLabel,
                    OccurredAt = buffered.OccurredAt,
                    Metadata = buffered.Metadata,
                    CreatedAt = buffered.CreatedAt,
                    UpdatedAt = buffered.CreatedAt
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to deserialize buffered analytics action.");
            }
        }

        return result.AsReadOnly();
    }

    private record BufferedAction(
        Guid Id, Guid UserId, Guid PageSessionId, string Page,
        string ActionType, string? ActionLabel, DateTimeOffset OccurredAt,
        string? Metadata, DateTime CreatedAt);
}
