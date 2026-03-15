using FluentValidation;
using FluentValidation.Results;
using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.MindMap;

public record ConvertNodeToGoalCommand(int Year, Guid NodeId, GoalType GoalType, LifeArea LifeArea)
    : ICommand<OneOf<GoalDto, NotFoundError, ValidationError>>, IAuthenticatedCommand;

public class ConvertNodeToGoalCommandHandler
    : ICommandHandler<ConvertNodeToGoalCommand, OneOf<GoalDto, NotFoundError, ValidationError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public ConvertNodeToGoalCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<GoalDto, NotFoundError, ValidationError>> Handle(
        ConvertNodeToGoalCommand command, CancellationToken ct)
    {
        var mindMap = await _uow.MindMaps.GetByUserAndYearAsync(_currentUser.UserId, command.Year, ct);
        if (mindMap is null)
            return new NotFoundError("MindMap", Guid.Empty);

        var node = mindMap.Nodes.FirstOrDefault(n => n.Id == command.NodeId);
        if (node is null)
            return new NotFoundError("MindMapNode", command.NodeId);

        if (node.NodeType == MindMapNodeType.Goal)
            return new ValidationError(new[]
            {
                new ValidationFailure("NodeType", "Node is already linked to a goal.")
            });

        var goal = new Domain.Entities.Goal
        {
            UserId = _currentUser.UserId,
            Year = command.Year,
            Title = node.Label,
            GoalType = command.GoalType,
            Status = GoalStatus.Active,
            LifeArea = command.LifeArea,
            EnergyLevel = EnergyLevel.Medium,
        };

        await _uow.Goals.AddAsync(goal, ct);

        node.LinkedGoalId = goal.Id;
        node.NodeType = MindMapNodeType.Goal;
        await _uow.MindMaps.UpdateNodeAsync(node, ct);

        await _uow.SaveChangesAsync(ct);

        return goal.ToDto();
    }
}
