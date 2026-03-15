using YearPlanningApp.Domain.Entities;

namespace YearPlanningApp.Domain.Interfaces;

public interface IHabitRepository : IRepository<Habit>
{
    Task<IEnumerable<Habit>> GetByUserAndYearAsync(Guid userId, int year, CancellationToken ct = default);
    Task<IEnumerable<HabitLog>> GetLogsByHabitAndDateRangeAsync(Guid habitId, DateTime from, DateTime to, CancellationToken ct = default);
    Task AddLogAsync(HabitLog log, CancellationToken ct = default);
}
