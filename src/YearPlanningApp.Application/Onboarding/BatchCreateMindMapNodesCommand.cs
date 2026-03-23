using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Application.MindMap;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Onboarding;

public record BatchNodeInput(
    string Label,
    string NodeType,
    string? ParentLabel,
    string? IkigaiCategory,
    string? Icon,
    string? Notes);

public record BatchCreateMindMapNodesCommand(int Year, List<BatchNodeInput> Nodes)
    : ICommand<OneOf<MindMapDto, NotFoundError>>, IAuthenticatedCommand;

public class BatchCreateMindMapNodesCommandHandler
    : ICommandHandler<BatchCreateMindMapNodesCommand, OneOf<MindMapDto, NotFoundError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    private static readonly (double X, double Y)[] BranchPositions =
    {
        (-400, 0), (400, 0), (0, -350), (0, 350), (-350, -250), (350, 250), (-350, 250), (350, -250),
    };

    public BatchCreateMindMapNodesCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<MindMapDto, NotFoundError>> Handle(
        BatchCreateMindMapNodesCommand command, CancellationToken ct)
    {
        var mindMap = await _uow.MindMaps.GetByUserAndYearAsync(_currentUser.UserId, command.Year, ct);
        if (mindMap is null)
            return new NotFoundError("MindMap", Guid.Empty);

        var rootNode = mindMap.Nodes.FirstOrDefault(n => n.ParentNodeId == null);
        if (rootNode is null)
            return new NotFoundError("RootNode", Guid.Empty);

        await _uow.BeginTransactionAsync(ct);
        try
        {
            var branchNodes = command.Nodes.Where(n => n.NodeType == "Branch").ToList();
            var branchMap = new Dictionary<string, MindMapNode>(StringComparer.OrdinalIgnoreCase);

            for (int i = 0; i < branchNodes.Count; i++)
            {
                var input = branchNodes[i];
                var (bx, by) = BranchPositions[i % BranchPositions.Length];

                var branch = new MindMapNode
                {
                    MindMapId = mindMap.Id,
                    ParentNodeId = rootNode.Id,
                    NodeType = MindMapNodeType.Branch,
                    Label = input.Label,
                    PositionX = bx,
                    PositionY = by,
                    IkigaiCategory = ParseIkigaiCategory(input.IkigaiCategory),
                    Icon = input.Icon,
                    Notes = input.Notes,
                };
                await _uow.MindMaps.AddNodeAsync(branch, ct);
                await _uow.SaveChangesAsync(ct); // flush to get ID
                branchMap[input.Label] = branch;
            }

            var leafCountByParent = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            var leafNodes = command.Nodes.Where(n => n.NodeType == "Leaf").ToList();

            foreach (var input in leafNodes)
            {
                if (string.IsNullOrEmpty(input.ParentLabel)) continue;
                if (!branchMap.TryGetValue(input.ParentLabel, out var parentBranch)) continue;

                leafCountByParent.TryGetValue(input.ParentLabel, out var leafIdx);
                leafCountByParent[input.ParentLabel] = leafIdx + 1;

                var leaf = new MindMapNode
                {
                    MindMapId = mindMap.Id,
                    ParentNodeId = parentBranch.Id,
                    NodeType = MindMapNodeType.Leaf,
                    Label = input.Label,
                    PositionX = parentBranch.PositionX,
                    PositionY = parentBranch.PositionY + 120 * (leafIdx + 1),
                    IkigaiCategory = ParseIkigaiCategory(input.IkigaiCategory),
                    Icon = input.Icon,
                    Notes = input.Notes,
                };
                await _uow.MindMaps.AddNodeAsync(leaf, ct);
            }

            await _uow.SaveChangesAsync(ct);
            await _uow.CommitTransactionAsync(ct);
        }
        catch
        {
            await _uow.RollbackTransactionAsync(ct);
            throw;
        }

        var updated = await _uow.MindMaps.GetByUserAndYearAsync(_currentUser.UserId, command.Year, ct);
        return updated!.ToDto();
    }

    private static IkigaiCategory? ParseIkigaiCategory(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return Enum.TryParse<IkigaiCategory>(value, true, out var cat) ? cat : null;
    }
}
