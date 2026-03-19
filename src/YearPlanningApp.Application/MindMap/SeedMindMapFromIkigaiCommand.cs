using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Application.Ikigai;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.MindMap;

public enum MergeMode { Merge, Replace }

public record SeedMindMapFromIkigaiCommand(int Year, IkigaiExtractionResult Themes, MergeMode Mode)
    : ICommand<OneOf<SuccessResult, NotFoundError>>, IAuthenticatedCommand;

public class SeedMindMapFromIkigaiCommandHandler
    : ICommandHandler<SeedMindMapFromIkigaiCommand, OneOf<SuccessResult, NotFoundError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    // Branch cross positions: left, right, top, bottom
    private static readonly (double X, double Y)[] BranchPositions =
    {
        (-400, 0),
        (400, 0),
        (0, -400),
        (0, 400),
    };

    public SeedMindMapFromIkigaiCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<SuccessResult, NotFoundError>> Handle(
        SeedMindMapFromIkigaiCommand command, CancellationToken ct)
    {
        var mindMap = await _uow.MindMaps.GetByUserAndYearAsync(_currentUser.UserId, command.Year, ct);
        if (mindMap is null)
            return new NotFoundError("MindMap", Guid.Empty);

        var journey = await _uow.Ikigai.GetJourneyByUserAndYearAsync(_currentUser.UserId, command.Year, ct);
        if (journey is null)
            return new NotFoundError("IkigaiJourney", Guid.Empty);

        if (command.Mode == MergeMode.Replace)
        {
            // Soft-delete all non-root nodes
            var nonRootNodes = mindMap.Nodes.Where(n => n.ParentNodeId != null).ToList();
            foreach (var node in nonRootNodes)
                await _uow.MindMaps.RemoveNodeAsync(node, ct);
        }

        // Update root label to NorthStar statement if available
        var rootNode = mindMap.Nodes.FirstOrDefault(n => n.ParentNodeId == null);
        if (rootNode is not null && journey.NorthStar is not null)
        {
            rootNode.Label = journey.NorthStar.Statement;
            await _uow.MindMaps.UpdateNodeAsync(rootNode, ct);
        }

        // Create branch + leaf nodes per category
        var categories = command.Themes.Categories;
        for (int i = 0; i < categories.Count && i < BranchPositions.Length; i++)
        {
            var category = categories[i];
            var (branchX, branchY) = BranchPositions[i];

            var branch = new MindMapNode
            {
                MindMapId = mindMap.Id,
                ParentNodeId = rootNode?.Id,
                NodeType = MindMapNodeType.Branch,
                Label = category.Label,
                PositionX = branchX,
                PositionY = branchY,
            };
            await _uow.MindMaps.AddNodeAsync(branch, ct);
            await _uow.SaveChangesAsync(ct); // flush so branch gets an Id

            for (int j = 0; j < category.Themes.Count; j++)
            {
                var leaf = new MindMapNode
                {
                    MindMapId = mindMap.Id,
                    ParentNodeId = branch.Id,
                    NodeType = MindMapNodeType.Leaf,
                    Label = category.Themes[j],
                    PositionX = branchX,
                    PositionY = branchY + 120 * (j + 1),
                };
                await _uow.MindMaps.AddNodeAsync(leaf, ct);
            }
        }

        journey.SetHasSeededMindMap(true);
        await _uow.SaveChangesAsync(ct);

        return new SuccessResult();
    }
}
