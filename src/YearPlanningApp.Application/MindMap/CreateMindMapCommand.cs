using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.MindMap;

public record CreateMindMapCommand(int Year)
    : ICommand<OneOf<MindMapDto, ConflictError>>, IAuthenticatedCommand;

public class CreateMindMapCommandHandler
    : ICommandHandler<CreateMindMapCommand, OneOf<MindMapDto, ConflictError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    private static readonly Dictionary<IkigaiRoomType, string> RoomBranchLabels = new()
    {
        { IkigaiRoomType.Love,       "What I Love" },
        { IkigaiRoomType.GoodAt,     "What I'm Good At" },
        { IkigaiRoomType.WorldNeeds, "What The World Needs" },
        { IkigaiRoomType.PaidFor,    "What I Can Be Paid For" },
    };

    public CreateMindMapCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<MindMapDto, ConflictError>> Handle(
        CreateMindMapCommand command, CancellationToken ct)
    {
        var existing = await _uow.MindMaps.GetByUserAndYearAsync(_currentUser.UserId, command.Year, ct);
        if (existing is not null)
            return new ConflictError($"Mind map for year {command.Year} already exists.");

        // Root node label = NorthStar statement, fallback to generic label
        var northStar = await _uow.Ikigai.GetNorthStarAsync(_currentUser.UserId, command.Year, ct);
        var rootLabel = northStar?.Statement ?? "My North Star";

        var mindMap = new Domain.Entities.MindMap
        {
            UserId = _currentUser.UserId,
            Year = command.Year,
        };

        var rootNode = new Domain.Entities.MindMapNode
        {
            MindMapId = mindMap.Id,
            NodeType = MindMapNodeType.Root,
            Label = rootLabel,
            PositionX = 0,
            PositionY = 0,
        };
        mindMap.Nodes.Add(rootNode);

        // Seed branch nodes from completed Ikigai rooms
        var seeds = await _uow.MindMaps.GetSeedSuggestionsFromIkigaiAsync(_currentUser.UserId, command.Year, ct);
        foreach (var label in seeds)
        {
            mindMap.Nodes.Add(new Domain.Entities.MindMapNode
            {
                MindMapId = mindMap.Id,
                ParentNodeId = rootNode.Id,
                NodeType = MindMapNodeType.Branch,
                Label = label,
                PositionX = 0,
                PositionY = 0,
            });
        }

        await _uow.MindMaps.AddAsync(mindMap, ct);
        await _uow.SaveChangesAsync(ct);

        var saved = await _uow.MindMaps.GetByUserAndYearAsync(_currentUser.UserId, command.Year, ct);
        return saved!.ToDto();
    }
}
