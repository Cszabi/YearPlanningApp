using YearPlanningApp.Domain.Common;
using YearPlanningApp.Domain.Enums;

namespace YearPlanningApp.Domain.Entities;

public class MindMapNode : BaseEntity
{
    public Guid MindMapId { get; set; }
    public MindMap MindMap { get; set; } = null!;
    public Guid? ParentNodeId { get; set; }
    public MindMapNode? ParentNode { get; set; }
    public MindMapNodeType NodeType { get; set; }
    public string Label { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public double PositionX { get; set; }
    public double PositionY { get; set; }
    public Guid? LinkedGoalId { get; set; }
    public IkigaiCategory? IkigaiCategory { get; set; }
    public string? Icon { get; set; }
    public ICollection<MindMapNode> Children { get; set; } = new List<MindMapNode>();
}
