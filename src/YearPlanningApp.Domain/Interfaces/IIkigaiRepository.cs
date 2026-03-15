using YearPlanningApp.Domain.Entities;

namespace YearPlanningApp.Domain.Interfaces;

public interface IIkigaiRepository : IRepository<IkigaiJourney>
{
    Task<IkigaiJourney?> GetJourneyByUserAndYearAsync(Guid userId, int year, CancellationToken ct = default);
    Task<IkigaiRoom?> GetRoomByTypeAsync(Guid journeyId, Enums.IkigaiRoomType roomType, CancellationToken ct = default);
    Task<NorthStar?> GetNorthStarAsync(Guid userId, int year, CancellationToken ct = default);
    Task<IEnumerable<UserValue>> GetValuesByUserAndYearAsync(Guid userId, int year, CancellationToken ct = default);
    Task UpsertNorthStarAsync(NorthStar northStar, CancellationToken ct = default);
    Task UpsertUserValuesAsync(Guid userId, int year, IEnumerable<UserValue> values, CancellationToken ct = default);
}
