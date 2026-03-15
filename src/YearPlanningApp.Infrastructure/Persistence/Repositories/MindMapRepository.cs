using Microsoft.EntityFrameworkCore;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Infrastructure.Persistence.Repositories;

public class MindMapRepository : BaseRepository<MindMap>, IMindMapRepository
{
    private static readonly Dictionary<IkigaiRoomType, string> RoomBranchLabels = new()
    {
        { IkigaiRoomType.Love,       "What I Love" },
        { IkigaiRoomType.GoodAt,     "What I'm Good At" },
        { IkigaiRoomType.WorldNeeds, "What The World Needs" },
        { IkigaiRoomType.PaidFor,    "What I Can Be Paid For" },
    };

    public MindMapRepository(AppDbContext context) : base(context) { }

    public async Task<MindMap?> GetByUserAndYearAsync(Guid userId, int year, CancellationToken ct = default)
        => await _context.MindMaps
            .Include(m => m.Nodes)
            .FirstOrDefaultAsync(m => m.UserId == userId && m.Year == year, ct);

    public async Task<MindMapNode?> GetNodeByIdAsync(Guid nodeId, CancellationToken ct = default)
        => await _context.MindMapNodes.FirstOrDefaultAsync(n => n.Id == nodeId, ct);

    public async Task AddNodeAsync(MindMapNode node, CancellationToken ct = default)
        => await _context.MindMapNodes.AddAsync(node, ct);

    public Task UpdateNodeAsync(MindMapNode node, CancellationToken ct = default)
    {
        node.UpdatedAt = DateTime.UtcNow;
        _context.MindMapNodes.Update(node);
        return Task.CompletedTask;
    }

    public Task RemoveNodeAsync(MindMapNode node, CancellationToken ct = default)
    {
        node.DeletedAt = DateTime.UtcNow;
        _context.MindMapNodes.Update(node);
        return Task.CompletedTask;
    }

    public async Task<IEnumerable<string>> GetSeedSuggestionsFromIkigaiAsync(Guid userId, int year, CancellationToken ct = default)
    {
        var journey = await _context.IkigaiJourneys
            .Include(j => j.Rooms)
            .FirstOrDefaultAsync(j => j.UserId == userId && j.Year == year, ct);

        if (journey is null) return Enumerable.Empty<string>();

        // Return one human-friendly branch label per completed Ikigai room
        return journey.Rooms
            .Where(r => r.IsComplete && RoomBranchLabels.ContainsKey(r.RoomType))
            .OrderBy(r => r.RoomType)
            .Select(r => RoomBranchLabels[r.RoomType])
            .ToList();
    }
}
