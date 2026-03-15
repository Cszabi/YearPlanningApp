using FluentValidation;
using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.MindMap;

public record AddNodeCommand(
    int Year,
    Guid? ParentNodeId,
    MindMapNodeType NodeType,
    string Label,
    double PositionX,
    double PositionY)
    : ICommand<OneOf<MindMapNodeDto, NotFoundError, ValidationError>>, IAuthenticatedCommand;

public class AddNodeCommandValidator : AbstractValidator<AddNodeCommand>
{
    public AddNodeCommandValidator()
    {
        RuleFor(x => x.Year).InclusiveBetween(2020, 2100);
        RuleFor(x => x.Label).NotEmpty().MaximumLength(200);
    }
}

public class AddNodeCommandHandler
    : ICommandHandler<AddNodeCommand, OneOf<MindMapNodeDto, NotFoundError, ValidationError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public AddNodeCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<MindMapNodeDto, NotFoundError, ValidationError>> Handle(
        AddNodeCommand command, CancellationToken ct)
    {
        var mindMap = await _uow.MindMaps.GetByUserAndYearAsync(_currentUser.UserId, command.Year, ct);
        if (mindMap is null)
            return new NotFoundError("MindMap", Guid.Empty);

        // Validate parent node belongs to this mind map
        if (command.ParentNodeId.HasValue)
        {
            var parentExists = mindMap.Nodes.Any(n => n.Id == command.ParentNodeId.Value);
            if (!parentExists)
                return new NotFoundError("MindMapNode", command.ParentNodeId.Value);
        }

        var node = new Domain.Entities.MindMapNode
        {
            MindMapId = mindMap.Id,
            ParentNodeId = command.ParentNodeId,
            NodeType = command.NodeType,
            Label = command.Label,
            PositionX = command.PositionX,
            PositionY = command.PositionY,
        };

        await _uow.MindMaps.AddNodeAsync(node, ct);
        await _uow.SaveChangesAsync(ct);

        return node.ToDto();
    }
}
