using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Ikigai;

public record GetIkigaiJourneyQuery(int Year)
    : IQuery<OneOf<IkigaiJourneyDto, NotFoundError>>, IAuthenticatedCommand;

public class GetIkigaiJourneyQueryHandler
    : IQueryHandler<GetIkigaiJourneyQuery, OneOf<IkigaiJourneyDto, NotFoundError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetIkigaiJourneyQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<IkigaiJourneyDto, NotFoundError>> Handle(
        GetIkigaiJourneyQuery query, CancellationToken ct)
    {
        var journey = await _uow.Ikigai.GetJourneyByUserAndYearAsync(_currentUser.UserId, query.Year, ct);
        if (journey is null)
            return new NotFoundError("IkigaiJourney", Guid.Empty);

        return journey.ToDto();
    }
}
