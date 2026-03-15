using Mediator;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Goals;

public record GetGoalsQuery(int Year, LifeArea? LifeArea, GoalStatus? Status)
    : IQuery<IEnumerable<GoalDto>>, IAuthenticatedCommand;

public class GetGoalsQueryHandler
    : IQueryHandler<GetGoalsQuery, IEnumerable<GoalDto>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetGoalsQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<IEnumerable<GoalDto>> Handle(GetGoalsQuery query, CancellationToken ct)
    {
        var goals = await _uow.Goals.GetByUserYearAndFilterAsync(
            _currentUser.UserId, query.Year, query.LifeArea, query.Status, ct);

        return goals.Select(g => g.ToDto()).ToList();
    }
}
