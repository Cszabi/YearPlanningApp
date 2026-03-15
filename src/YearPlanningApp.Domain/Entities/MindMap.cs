using YearPlanningApp.Domain.Common;

namespace YearPlanningApp.Domain.Entities;

public class MindMap : BaseEntity
{
    public Guid UserId { get; set; }
    public int Year { get; set; }
    public ICollection<MindMapNode> Nodes { get; set; } = new List<MindMapNode>();
}
