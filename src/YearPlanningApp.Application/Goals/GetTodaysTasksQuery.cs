using Mediator;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Goals;

public record GetTodaysTasksQuery : IQuery<IEnumerable<TaskDto>>, IAuthenticatedCommand;

public class GetTodaysTasksQueryHandler
    : IQueryHandler<GetTodaysTasksQuery, IEnumerable<TaskDto>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetTodaysTasksQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<IEnumerable<TaskDto>> Handle(GetTodaysTasksQuery query, CancellationToken ct)
    {
        var tasks = await _uow.Tasks.GetTodaysTasksAsync(_currentUser.UserId, ct);
        return tasks.Select(t => t.ToDto()).ToList();
    }
}
