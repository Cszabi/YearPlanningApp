using Microsoft.EntityFrameworkCore;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Infrastructure.Persistence.Repositories;

public class NotificationPreferenceRepository : INotificationPreferenceRepository
{
    private readonly AppDbContext _context;

    public NotificationPreferenceRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<NotificationPreference?> GetByUserIdAsync(Guid userId, CancellationToken ct = default)
        => await _context.NotificationPreferences.FirstOrDefaultAsync(p => p.UserId == userId, ct);

    public async Task UpsertAsync(NotificationPreference preference, CancellationToken ct = default)
    {
        var existing = await _context.NotificationPreferences
            .FirstOrDefaultAsync(p => p.UserId == preference.UserId, ct);

        if (existing is null)
        {
            await _context.NotificationPreferences.AddAsync(preference, ct);
        }
        else
        {
            existing.WeeklyReviewEnabled = preference.WeeklyReviewEnabled;
            existing.WeeklyReviewDayOfWeek = preference.WeeklyReviewDayOfWeek;
            existing.WeeklyReviewHour = preference.WeeklyReviewHour;
            existing.GoalDeadlineEnabled = preference.GoalDeadlineEnabled;
            existing.GoalDeadlineDaysBeforeList = preference.GoalDeadlineDaysBeforeList;
            existing.HabitStreakRiskEnabled = preference.HabitStreakRiskEnabled;
            existing.HabitStreakRiskHour = preference.HabitStreakRiskHour;
            existing.TimezoneId = preference.TimezoneId;
            existing.UpdatedAt = DateTime.UtcNow;
            _context.NotificationPreferences.Update(existing);
        }
    }

    public async Task<IEnumerable<NotificationPreference>> GetAllAsync(CancellationToken ct = default)
        => await _context.NotificationPreferences.ToListAsync(ct);
}
