using YearPlanningApp.Domain.Entities;

namespace YearPlanningApp.Domain.Interfaces;

public interface IFlowSessionRepository : IRepository<FlowSession>
{
    Task<FlowSession?> GetActiveSessionAsync(Guid userId, CancellationToken ct = default);
    Task<IEnumerable<FlowSession>> GetSessionsByDateRangeAsync(Guid userId, DateTime from, DateTime to, CancellationToken ct = default);
}
