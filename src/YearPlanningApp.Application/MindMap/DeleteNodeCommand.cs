using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.MindMap;

public record DeleteNodeCommand(int Year, Guid NodeId)
    : ICommand<OneOf<SuccessResult, NotFoundError>>, IAuthenticatedCommand;

public class DeleteNodeCommandHandler
    : ICommandHandler<DeleteNodeCommand, OneOf<SuccessResult, NotFoundError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public DeleteNodeCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<SuccessResult, NotFoundError>> Handle(
        DeleteNodeCommand command, CancellationToken ct)
    {
        var mindMap = await _uow.MindMaps.GetByUserAndYearAsync(_currentUser.UserId, command.Year, ct);
        if (mindMap is null)
            return new NotFoundError("MindMap", Guid.Empty);

        var node = mindMap.Nodes.FirstOrDefault(n => n.Id == command.NodeId);
        if (node is null)
            return new NotFoundError("MindMapNode", command.NodeId);

        await _uow.MindMaps.RemoveNodeAsync(node, ct);
        await _uow.SaveChangesAsync(ct);

        return new SuccessResult();
    }
}
