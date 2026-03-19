using Mediator;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Reviews;

public record GetReviewsQuery(ReviewType? ReviewType, int? Year)
    : IQuery<IEnumerable<ReviewDto>>, IAuthenticatedCommand;

public class GetReviewsQueryHandler
    : IQueryHandler<GetReviewsQuery, IEnumerable<ReviewDto>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetReviewsQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<IEnumerable<ReviewDto>> Handle(GetReviewsQuery query, CancellationToken ct)
    {
        var reviews = await _uow.Reviews.GetByUserAndYearAsync(
            _currentUser.UserId, query.ReviewType, query.Year, ct);

        return reviews.Select(r => r.ToDto()).ToList();
    }
}
