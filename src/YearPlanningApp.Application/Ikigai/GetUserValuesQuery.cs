using Mediator;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Ikigai;

public record GetUserValuesQuery(int Year)
    : IQuery<IEnumerable<UserValueDto>>, IAuthenticatedCommand;

public class GetUserValuesQueryHandler
    : IQueryHandler<GetUserValuesQuery, IEnumerable<UserValueDto>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetUserValuesQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<IEnumerable<UserValueDto>> Handle(
        GetUserValuesQuery query, CancellationToken ct)
    {
        var values = await _uow.Ikigai.GetValuesByUserAndYearAsync(_currentUser.UserId, query.Year, ct);
        return values.Select(v => v.ToDto());
    }
}
