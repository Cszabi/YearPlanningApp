using Mediator;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Goals;

public record GetHabitsQuery(int Year) : IQuery<IEnumerable<HabitDto>>, IAuthenticatedCommand;

public class GetHabitsQueryHandler
    : IQueryHandler<GetHabitsQuery, IEnumerable<HabitDto>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetHabitsQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<IEnumerable<HabitDto>> Handle(GetHabitsQuery query, CancellationToken ct)
    {
        var habits = await _uow.Habits.GetByUserAndYearAsync(_currentUser.UserId, query.Year, ct);
        return habits.Select(h => h.ToDto()).ToList();
    }
}
