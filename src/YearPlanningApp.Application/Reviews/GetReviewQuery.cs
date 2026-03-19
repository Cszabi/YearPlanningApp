using Mediator;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Reviews;

public record GetReviewQuery(ReviewType ReviewType, DateTime PeriodStart)
    : IQuery<ReviewDto?>, IAuthenticatedCommand;

public class GetReviewQueryHandler
    : IQueryHandler<GetReviewQuery, ReviewDto?>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetReviewQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<ReviewDto?> Handle(GetReviewQuery query, CancellationToken ct)
    {
        var review = await _uow.Reviews.GetByTypeAndPeriodAsync(
            _currentUser.UserId, query.ReviewType, query.PeriodStart, ct);

        return review?.ToDto();
    }
}
