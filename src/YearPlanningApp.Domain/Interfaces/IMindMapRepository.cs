using YearPlanningApp.Domain.Entities;

namespace YearPlanningApp.Domain.Interfaces;

public interface IMindMapRepository : IRepository<MindMap>
{
    Task<MindMap?> GetByUserAndYearAsync(Guid userId, int year, CancellationToken ct = default);
    Task<MindMapNode?> GetNodeByIdAsync(Guid nodeId, CancellationToken ct = default);
    Task AddNodeAsync(MindMapNode node, CancellationToken ct = default);
    Task UpdateNodeAsync(MindMapNode node, CancellationToken ct = default);
    Task RemoveNodeAsync(MindMapNode node, CancellationToken ct = default);
    Task<IEnumerable<string>> GetSeedSuggestionsFromIkigaiAsync(Guid userId, int year, CancellationToken ct = default);
}
