using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Goals;

public record GetGoalProgressHistoryQuery(Guid GoalId)
    : IQuery<OneOf<IReadOnlyList<GoalProgressSnapshotDto>, NotFoundError>>, IAuthenticatedCommand;

public class GetGoalProgressHistoryQueryHandler
    : IQueryHandler<GetGoalProgressHistoryQuery, OneOf<IReadOnlyList<GoalProgressSnapshotDto>, NotFoundError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetGoalProgressHistoryQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<IReadOnlyList<GoalProgressSnapshotDto>, NotFoundError>> Handle(
        GetGoalProgressHistoryQuery query, CancellationToken ct)
    {
        var goal = await _uow.Goals.GetByIdAsync(query.GoalId, ct);
        if (goal is null || goal.UserId != _currentUser.UserId)
            return new NotFoundError("Goal", query.GoalId);

        var snapshots = await _uow.GoalProgressSnapshots.GetByGoalIdAsync(query.GoalId, _currentUser.UserId, ct);
        return snapshots.Select(s => s.ToDto()).ToList().AsReadOnly();
    }
}
