using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Goals;

public record GetGoalByIdQuery(Guid GoalId, int Year)
    : IQuery<OneOf<GoalDto, NotFoundError>>, IAuthenticatedCommand;

public class GetGoalByIdQueryHandler
    : IQueryHandler<GetGoalByIdQuery, OneOf<GoalDto, NotFoundError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetGoalByIdQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<GoalDto, NotFoundError>> Handle(
        GetGoalByIdQuery query, CancellationToken ct)
    {
        var goals = await _uow.Goals.GetByUserAndYearAsync(_currentUser.UserId, query.Year, ct);
        var goal = goals.FirstOrDefault(g => g.Id == query.GoalId);
        if (goal is null)
            return new NotFoundError("Goal", query.GoalId);

        var progress = await _uow.Goals.CalculateGoalProgressAsync(goal.Id, ct);
        return goal.ToDto(progress);
    }
}
