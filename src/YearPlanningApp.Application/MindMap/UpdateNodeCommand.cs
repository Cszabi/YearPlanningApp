using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.MindMap;

public record UpdateNodeCommand(
    int Year,
    Guid NodeId,
    string? Label,
    string? Notes,
    double? PositionX,
    double? PositionY,
    string? IkigaiCategory,
    string? Icon)
    : ICommand<OneOf<MindMapNodeDto, NotFoundError>>, IAuthenticatedCommand;

public class UpdateNodeCommandHandler
    : ICommandHandler<UpdateNodeCommand, OneOf<MindMapNodeDto, NotFoundError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public UpdateNodeCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<MindMapNodeDto, NotFoundError>> Handle(
        UpdateNodeCommand command, CancellationToken ct)
    {
        var mindMap = await _uow.MindMaps.GetByUserAndYearAsync(_currentUser.UserId, command.Year, ct);
        if (mindMap is null)
            return new NotFoundError("MindMap", Guid.Empty);

        var node = mindMap.Nodes.FirstOrDefault(n => n.Id == command.NodeId);
        if (node is null)
            return new NotFoundError("MindMapNode", command.NodeId);

        if (command.Label is not null) node.Label = command.Label;
        if (command.Notes is not null) node.Notes = command.Notes;
        if (command.PositionX.HasValue) node.PositionX = command.PositionX.Value;
        if (command.PositionY.HasValue) node.PositionY = command.PositionY.Value;
        if (command.IkigaiCategory is not null)
            node.IkigaiCategory = command.IkigaiCategory == ""
                ? null
                : Enum.TryParse<IkigaiCategory>(command.IkigaiCategory, true, out var cat) ? cat : node.IkigaiCategory;
        if (command.Icon is not null)
            node.Icon = command.Icon == "" ? null : command.Icon;

        await _uow.MindMaps.UpdateNodeAsync(node, ct);
        await _uow.SaveChangesAsync(ct);

        return node.ToDto();
    }
}
