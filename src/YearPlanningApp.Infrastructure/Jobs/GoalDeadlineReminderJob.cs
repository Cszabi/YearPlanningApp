using System.Text.Json;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Infrastructure.Persistence;

namespace YearPlanningApp.Infrastructure.Jobs;

public class GoalDeadlineReminderJob
{
    private readonly AppDbContext _context;
    private readonly IPushNotificationService _push;
    private readonly ILogger<GoalDeadlineReminderJob> _logger;

    public GoalDeadlineReminderJob(
        AppDbContext context,
        IPushNotificationService push,
        ILogger<GoalDeadlineReminderJob> logger)
    {
        _context = context;
        _push = push;
        _logger = logger;
    }

    [AutomaticRetry(Attempts = 0)]
    public async Task ExecuteAsync(CancellationToken ct = default)
    {
        var prefs = await _context.NotificationPreferences
            .Where(p => p.GoalDeadlineEnabled && p.DeletedAt == null)
            .ToListAsync(ct);

        var today = DateTime.UtcNow.Date;

        foreach (var pref in prefs)
        {
            try
            {
                int[] daysBefore;
                try
                {
                    daysBefore = JsonSerializer.Deserialize<int[]>(pref.GoalDeadlineDaysBeforeList) ?? [1, 3, 7];
                }
                catch
                {
                    daysBefore = [1, 3, 7];
                }

                var targetDates = daysBefore.Select(d => today.AddDays(d)).ToList();

                var goals = await _context.Goals
                    .Where(g => g.UserId == pref.UserId
                        && g.Status == GoalStatus.Active
                        && g.TargetDate.HasValue
                        && targetDates.Contains(g.TargetDate!.Value.Date)
                        && g.DeletedAt == null)
                    .ToListAsync(ct);

                foreach (var goal in goals)
                {
                    var daysLeft = (int)(goal.TargetDate!.Value.Date - today).TotalDays;
                    var dayLabel = daysLeft == 1 ? "1 day" : $"{daysLeft} days";
                    await _push.SendAsync(
                        pref.UserId,
                        $"Goal deadline in {dayLabel}",
                        goal.Title,
                        "/goals",
                        ct);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GoalDeadlineReminderJob failed for user {UserId}", pref.UserId);
            }
        }
    }
}
