using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.MindMap;

public record GetNodesByDeadlineQuery(int Year, int WithinDays)
    : IQuery<OneOf<List<MindMapNodeDto>, NotFoundError>>, IAuthenticatedCommand;

public class GetNodesByDeadlineQueryHandler
    : IQueryHandler<GetNodesByDeadlineQuery, OneOf<List<MindMapNodeDto>, NotFoundError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetNodesByDeadlineQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<List<MindMapNodeDto>, NotFoundError>> Handle(
        GetNodesByDeadlineQuery query, CancellationToken ct)
    {
        var mindMap = await _uow.MindMaps.GetByUserAndYearAsync(_currentUser.UserId, query.Year, ct);
        if (mindMap is null)
            return new NotFoundError("MindMap", Guid.Empty);

        var linkedGoalIds = mindMap.Nodes
            .Where(n => n.LinkedGoalId.HasValue)
            .Select(n => n.LinkedGoalId!.Value)
            .Distinct()
            .ToList();

        if (linkedGoalIds.Count == 0)
            return new List<MindMapNodeDto>();

        var goals = await _uow.Goals.GetByIdsAsync(linkedGoalIds, ct);
        var cutoff = DateTime.UtcNow.AddDays(query.WithinDays);

        var goalMap = goals
            .Where(g => g.TargetDate.HasValue && g.TargetDate.Value <= cutoff)
            .ToDictionary(g => g.Id);

        return mindMap.Nodes
            .Where(n => n.LinkedGoalId.HasValue && goalMap.ContainsKey(n.LinkedGoalId!.Value))
            .Select(n => n.ToDto(goalMap[n.LinkedGoalId!.Value]))
            .ToList();
    }
}
