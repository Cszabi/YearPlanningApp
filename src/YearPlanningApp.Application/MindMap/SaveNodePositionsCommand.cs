using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.MindMap;

public record NodePositionUpdate(Guid NodeId, double X, double Y);

public record SaveNodePositionsCommand(int Year, List<NodePositionUpdate> Positions)
    : ICommand<OneOf<SuccessResult, NotFoundError>>, IAuthenticatedCommand;

public class SaveNodePositionsCommandHandler
    : ICommandHandler<SaveNodePositionsCommand, OneOf<SuccessResult, NotFoundError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public SaveNodePositionsCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<SuccessResult, NotFoundError>> Handle(
        SaveNodePositionsCommand command, CancellationToken ct)
    {
        var mindMap = await _uow.MindMaps.GetByUserAndYearAsync(_currentUser.UserId, command.Year, ct);
        if (mindMap is null)
            return new NotFoundError("MindMap", Guid.Empty);

        foreach (var update in command.Positions)
        {
            var node = mindMap.Nodes.FirstOrDefault(n => n.Id == update.NodeId);
            if (node is null) continue; // skip unknown node ids

            node.PositionX = update.X;
            node.PositionY = update.Y;
            await _uow.MindMaps.UpdateNodeAsync(node, ct);
        }

        await _uow.SaveChangesAsync(ct);
        return new SuccessResult();
    }
}
