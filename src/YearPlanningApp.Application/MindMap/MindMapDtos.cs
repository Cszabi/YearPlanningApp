using YearPlanningApp.Domain.Entities;

namespace YearPlanningApp.Application.MindMap;

public record MindMapDto(
    Guid Id,
    int Year,
    List<MindMapNodeDto> Nodes);

public record MindMapNodeDto(
    Guid Id,
    Guid? ParentNodeId,
    string NodeType,
    string Label,
    string? Notes,
    double PositionX,
    double PositionY,
    Guid? LinkedGoalId);

public static class MindMapMappings
{
    public static MindMapDto ToDto(this Domain.Entities.MindMap m) => new(
        m.Id,
        m.Year,
        m.Nodes.Select(n => n.ToDto()).ToList());

    public static MindMapNodeDto ToDto(this MindMapNode n) => new(
        n.Id,
        n.ParentNodeId,
        n.NodeType.ToString(),
        n.Label,
        n.Notes,
        n.PositionX,
        n.PositionY,
        n.LinkedGoalId);
}
