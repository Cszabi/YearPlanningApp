using Microsoft.EntityFrameworkCore;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Infrastructure.Persistence.Repositories;

public class IkigaiRepository : BaseRepository<IkigaiJourney>, IIkigaiRepository
{
    public IkigaiRepository(AppDbContext context) : base(context) { }

    public async Task<IkigaiJourney?> GetJourneyByUserAndYearAsync(Guid userId, int year, CancellationToken ct = default)
        => await _context.IkigaiJourneys
            .Include(j => j.Rooms)
            .Include(j => j.NorthStar)
            .Include(j => j.Values)
            .FirstOrDefaultAsync(j => j.UserId == userId && j.Year == year, ct);

    public async Task<IkigaiRoom?> GetRoomByTypeAsync(Guid journeyId, IkigaiRoomType roomType, CancellationToken ct = default)
        => await _context.IkigaiRooms
            .FirstOrDefaultAsync(r => r.JourneyId == journeyId && r.RoomType == roomType, ct);

    public async Task<NorthStar?> GetNorthStarAsync(Guid userId, int year, CancellationToken ct = default)
        => await _context.NorthStars
            .FirstOrDefaultAsync(n => n.UserId == userId && n.Year == year, ct);

    public async Task<IEnumerable<UserValue>> GetValuesByUserAndYearAsync(Guid userId, int year, CancellationToken ct = default)
        => await _context.UserValues
            .Where(v => v.UserId == userId && v.Year == year)
            .OrderBy(v => v.Rank)
            .ToListAsync(ct);

    public async Task UpsertNorthStarAsync(NorthStar northStar, CancellationToken ct = default)
    {
        var existing = await GetNorthStarAsync(northStar.UserId, northStar.Year, ct);
        if (existing is null)
            await _context.NorthStars.AddAsync(northStar, ct);
        else
        {
            existing.Statement = northStar.Statement;
            existing.UpdatedAt = DateTime.UtcNow;
            _context.NorthStars.Update(existing);
        }
    }

    public async Task UpsertUserValuesAsync(Guid userId, int year, IEnumerable<UserValue> values, CancellationToken ct = default)
    {
        var existing = await _context.UserValues
            .Where(v => v.UserId == userId && v.Year == year)
            .ToListAsync(ct);
        _context.UserValues.RemoveRange(existing);
        await _context.UserValues.AddRangeAsync(values, ct);
    }
}
