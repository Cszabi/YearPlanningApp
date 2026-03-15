using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Ikigai;

public record GetNorthStarQuery(int Year)
    : IQuery<OneOf<NorthStarDto, NotFoundError>>, IAuthenticatedCommand;

public class GetNorthStarQueryHandler
    : IQueryHandler<GetNorthStarQuery, OneOf<NorthStarDto, NotFoundError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetNorthStarQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<NorthStarDto, NotFoundError>> Handle(
        GetNorthStarQuery query, CancellationToken ct)
    {
        var northStar = await _uow.Ikigai.GetNorthStarAsync(_currentUser.UserId, query.Year, ct);
        if (northStar is null)
            return new NotFoundError("NorthStar", Guid.Empty);

        return northStar.ToDto();
    }
}
