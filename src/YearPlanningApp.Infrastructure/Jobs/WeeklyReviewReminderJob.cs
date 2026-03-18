using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Infrastructure.Persistence;

namespace YearPlanningApp.Infrastructure.Jobs;

public class WeeklyReviewReminderJob
{
    private readonly AppDbContext _context;
    private readonly IPushNotificationService _push;
    private readonly ILogger<WeeklyReviewReminderJob> _logger;

    public WeeklyReviewReminderJob(
        AppDbContext context,
        IPushNotificationService push,
        ILogger<WeeklyReviewReminderJob> logger)
    {
        _context = context;
        _push = push;
        _logger = logger;
    }

    [AutomaticRetry(Attempts = 0)]
    public async Task ExecuteAsync(CancellationToken ct = default)
    {
        var prefs = await _context.NotificationPreferences
            .Where(p => p.WeeklyReviewEnabled && p.DeletedAt == null)
            .ToListAsync(ct);

        var nowUtc = DateTime.UtcNow;

        foreach (var pref in prefs)
        {
            try
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById(pref.TimezoneId);
                var localNow = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, tz);

                if (localNow.DayOfWeek != pref.WeeklyReviewDayOfWeek) continue;
                if (localNow.Hour != pref.WeeklyReviewHour) continue;

                // ISO 8601 week start (Monday)
                var dayOfWeek = (int)localNow.DayOfWeek;
                var offset = dayOfWeek == 0 ? -6 : 1 - dayOfWeek;
                var weekStart = localNow.Date.AddDays(offset);
                var weekStartUtc = TimeZoneInfo.ConvertTimeToUtc(weekStart, tz);

                var hasReview = await _context.Reviews
                    .AnyAsync(r => r.UserId == pref.UserId
                        && r.ReviewType == ReviewType.Weekly
                        && r.PeriodStart >= weekStartUtc
                        && r.DeletedAt == null, ct);

                if (hasReview) continue;

                await _push.SendAsync(
                    pref.UserId,
                    "Time for your weekly review",
                    "Reflect on the past week and set intentions for the next one.",
                    "/reviews",
                    ct);
            }
            catch (TimeZoneNotFoundException)
            {
                _logger.LogWarning("Unknown timezone {Tz} for user {UserId}", pref.TimezoneId, pref.UserId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "WeeklyReviewReminderJob failed for user {UserId}", pref.UserId);
            }
        }
    }
}
