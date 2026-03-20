using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Infrastructure.Persistence;

namespace YearPlanningApp.Infrastructure.Jobs;

public class HabitReminderJob
{
    private readonly AppDbContext _context;
    private readonly IPushNotificationService _push;
    private readonly ILogger<HabitReminderJob> _logger;

    public HabitReminderJob(
        AppDbContext context,
        IPushNotificationService push,
        ILogger<HabitReminderJob> logger)
    {
        _context = context;
        _push = push;
        _logger = logger;
    }

    [AutomaticRetry(Attempts = 0)]
    public async Task ExecuteAsync(CancellationToken ct = default)
    {
        var utcNow = DateTime.UtcNow;

        var prefs = await _context.NotificationPreferences
            .Where(p => p.DeletedAt == null)
            .ToListAsync(ct);

        foreach (var pref in prefs)
        {
            try
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById(pref.TimezoneId);
                var localNow = TimeZoneInfo.ConvertTimeFromUtc(utcNow, tz);
                var localHour = localNow.Hour;

                var todayUtc = TimeZoneInfo.ConvertTimeToUtc(localNow.Date, tz);
                var tomorrowUtc = todayUtc.AddDays(1);

                var localMinute = localNow.Minute;

                var habits = await _context.Habits
                    .Include(h => h.Logs)
                    .Where(h => h.UserId == pref.UserId
                        && h.NotificationEnabled
                        && h.ReminderHour == localHour
                        && h.ReminderMinute == localMinute
                        && h.DeletedAt == null)
                    .ToListAsync(ct);

                foreach (var habit in habits)
                {
                    var alreadyLogged = habit.Logs.Any(l =>
                        l.LoggedDate >= todayUtc
                        && l.LoggedDate < tomorrowUtc
                        && l.DeletedAt == null);

                    if (alreadyLogged) continue;

                    await _push.SendAsync(
                        pref.UserId,
                        $"⏰ {habit.Title}",
                        "Time for your habit!",
                        "/goals",
                        ct);
                }
            }
            catch (TimeZoneNotFoundException)
            {
                _logger.LogWarning("Unknown timezone {Tz} for user {UserId}", pref.TimezoneId, pref.UserId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "HabitReminderJob failed for user {UserId}", pref.UserId);
            }
        }
    }
}
