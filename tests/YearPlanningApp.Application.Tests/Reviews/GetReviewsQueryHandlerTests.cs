using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Reviews;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Reviews;

public class GetReviewsQueryHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly GetReviewsQueryHandler _handler;

    public GetReviewsQueryHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new GetReviewsQueryHandler(_uow, _currentUser);
    }

    private Review BuildReview() => new()
    {
        Id = Guid.NewGuid(), UserId = _userId,
        ReviewType = ReviewType.Weekly,
        PeriodStart = new DateTime(2026, 3, 16), PeriodEnd = new DateTime(2026, 3, 22),
        Answers = "{}", IsComplete = false
    };

    [Fact]
    public async Task Handle_ShouldReturnReviews_WhenTheyExist()
    {
        var reviews = new[] { BuildReview(), BuildReview() };
        _uow.Reviews.GetByUserAndYearAsync(_userId, null, null, Arg.Any<CancellationToken>()).Returns(reviews);

        var result = await _handler.Handle(new GetReviewsQuery(null, null), CancellationToken.None);

        result.Count().ShouldBe(2);
    }

    [Fact]
    public async Task Handle_ShouldReturnEmptyList_WhenNoReviewsExist()
    {
        _uow.Reviews.GetByUserAndYearAsync(_userId, null, null, Arg.Any<CancellationToken>())
            .Returns(Array.Empty<Review>());

        var result = await _handler.Handle(new GetReviewsQuery(null, null), CancellationToken.None);

        result.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_ShouldPassFiltersToRepository()
    {
        _uow.Reviews.GetByUserAndYearAsync(_userId, ReviewType.Weekly, 2026, Arg.Any<CancellationToken>())
            .Returns(Array.Empty<Review>());

        await _handler.Handle(new GetReviewsQuery(ReviewType.Weekly, 2026), CancellationToken.None);

        await _uow.Reviews.Received(1).GetByUserAndYearAsync(_userId, ReviewType.Weekly, 2026, Arg.Any<CancellationToken>());
    }
}
