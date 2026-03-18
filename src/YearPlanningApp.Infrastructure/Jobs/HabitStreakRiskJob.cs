using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Infrastructure.Persistence;

namespace YearPlanningApp.Infrastructure.Jobs;

public class HabitStreakRiskJob
{
    private readonly AppDbContext _context;
    private readonly IPushNotificationService _push;
    private readonly ILogger<HabitStreakRiskJob> _logger;

    public HabitStreakRiskJob(
        AppDbContext context,
        IPushNotificationService push,
        ILogger<HabitStreakRiskJob> logger)
    {
        _context = context;
        _push = push;
        _logger = logger;
    }

    [AutomaticRetry(Attempts = 0)]
    public async Task ExecuteAsync(CancellationToken ct = default)
    {
        var prefs = await _context.NotificationPreferences
            .Where(p => p.HabitStreakRiskEnabled && p.DeletedAt == null)
            .ToListAsync(ct);

        var nowUtc = DateTime.UtcNow;

        foreach (var pref in prefs)
        {
            try
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById(pref.TimezoneId);
                var localNow = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, tz);

                if (localNow.Hour != pref.HabitStreakRiskHour) continue;

                var todayUtc = TimeZoneInfo.ConvertTimeToUtc(localNow.Date, tz);
                var tomorrowUtc = todayUtc.AddDays(1);

                var atRiskCount = await _context.Habits
                    .Where(h => h.UserId == pref.UserId
                        && h.CurrentStreak > 0
                        && h.DeletedAt == null
                        && !h.Logs.Any(l =>
                            l.LoggedDate >= todayUtc
                            && l.LoggedDate < tomorrowUtc
                            && l.DeletedAt == null))
                    .CountAsync(ct);

                if (atRiskCount == 0) continue;

                var streakLabel = atRiskCount == 1 ? "1 habit streak" : $"{atRiskCount} habit streaks";
                await _push.SendAsync(
                    pref.UserId,
                    $"{streakLabel} at risk",
                    "Log your habits before midnight to keep your streaks alive.",
                    "/goals",
                    ct);
            }
            catch (TimeZoneNotFoundException)
            {
                _logger.LogWarning("Unknown timezone {Tz} for user {UserId}", pref.TimezoneId, pref.UserId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "HabitStreakRiskJob failed for user {UserId}", pref.UserId);
            }
        }
    }
}
