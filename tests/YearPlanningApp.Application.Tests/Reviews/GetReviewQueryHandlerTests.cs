using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Reviews;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Reviews;

public class GetReviewQueryHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly GetReviewQueryHandler _handler;

    public GetReviewQueryHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new GetReviewQueryHandler(_uow, _currentUser);
    }

    [Fact]
    public async Task Handle_ShouldReturnReviewDto_WhenReviewExists()
    {
        var periodStart = new DateTime(2026, 3, 16, 0, 0, 0, DateTimeKind.Utc);
        var review = new Review
        {
            Id = Guid.NewGuid(), UserId = _userId, ReviewType = ReviewType.Weekly,
            PeriodStart = periodStart, PeriodEnd = periodStart.AddDays(6),
            Answers = "{}", IsComplete = false
        };
        _uow.Reviews.GetByTypeAndPeriodAsync(_userId, ReviewType.Weekly, periodStart, Arg.Any<CancellationToken>())
            .Returns(review);

        var result = await _handler.Handle(new GetReviewQuery(ReviewType.Weekly, periodStart), CancellationToken.None);

        result.ShouldNotBeNull();
        result!.ReviewType.ShouldBe("Weekly");
    }

    [Fact]
    public async Task Handle_ShouldReturnNull_WhenReviewDoesNotExist()
    {
        var periodStart = new DateTime(2026, 3, 16);
        _uow.Reviews.GetByTypeAndPeriodAsync(_userId, ReviewType.Weekly, periodStart, Arg.Any<CancellationToken>())
            .Returns((Review?)null);

        var result = await _handler.Handle(new GetReviewQuery(ReviewType.Weekly, periodStart), CancellationToken.None);

        result.ShouldBeNull();
    }
}
