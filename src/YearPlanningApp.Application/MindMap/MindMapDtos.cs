using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;

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
    Guid? LinkedGoalId,
    string? IkigaiCategory,
    string? Icon,
    string? LifeArea,
    string? GoalStatus,
    DateTimeOffset? GoalTargetDate,
    int TaskCount,
    int CompletedTaskCount,
    bool HasSmartGoal,
    bool HasMilestones);

public static class MindMapMappings
{
    public static MindMapDto ToDto(this Domain.Entities.MindMap m, Dictionary<Guid, Goal>? goalMap = null) => new(
        m.Id,
        m.Year,
        m.Nodes.Select(n => n.ToDto(
            n.LinkedGoalId.HasValue && goalMap != null
                ? goalMap.GetValueOrDefault(n.LinkedGoalId.Value)
                : null
        )).ToList());

    public static MindMapNodeDto ToDto(this MindMapNode n, Goal? goal = null)
    {
        var allTasks = goal?.Milestones.SelectMany(m => m.Tasks).ToList();
        var taskCount = allTasks?.Count ?? 0;
        var completedCount = allTasks?.Count(t => t.Status == TaskItemStatus.Done) ?? 0;
        DateTimeOffset? targetDate = goal?.TargetDate.HasValue == true
            ? new DateTimeOffset(DateTime.SpecifyKind(goal.TargetDate!.Value, DateTimeKind.Utc))
            : null;

        return new MindMapNodeDto(
            n.Id,
            n.ParentNodeId,
            n.NodeType.ToString(),
            n.Label,
            n.Notes,
            n.PositionX,
            n.PositionY,
            n.LinkedGoalId,
            n.IkigaiCategory?.ToString(),
            n.Icon,
            n.LifeArea?.ToString(),
            goal?.Status.ToString(),
            targetDate,
            taskCount,
            completedCount,
            goal?.SmartGoal is not null,
            goal?.Milestones.Count > 0);
    }
}
