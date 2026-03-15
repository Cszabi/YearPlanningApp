using Microsoft.EntityFrameworkCore;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Infrastructure.Persistence.Repositories;

public class HabitRepository : BaseRepository<Habit>, IHabitRepository
{
    public HabitRepository(AppDbContext context) : base(context) { }

    public async Task<IEnumerable<Habit>> GetByUserAndYearAsync(Guid userId, int year, CancellationToken ct = default)
        => await _context.Habits
            .Include(h => h.Logs)
            .Where(h => h.UserId == userId && h.Goal.Year == year)
            .ToListAsync(ct);

    public async Task<IEnumerable<HabitLog>> GetLogsByHabitAndDateRangeAsync(Guid habitId, DateTime from, DateTime to, CancellationToken ct = default)
        => await _context.HabitLogs
            .Where(l => l.HabitId == habitId && l.LoggedDate >= from && l.LoggedDate <= to)
            .ToListAsync(ct);

    public async Task AddLogAsync(HabitLog log, CancellationToken ct = default)
        => await _context.HabitLogs.AddAsync(log, ct);
}
