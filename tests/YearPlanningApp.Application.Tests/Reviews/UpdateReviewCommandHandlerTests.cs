using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Reviews;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Reviews;

public class UpdateReviewCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly UpdateReviewCommandHandler _handler;

    public UpdateReviewCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new UpdateReviewCommandHandler(_uow, _currentUser);
    }

    private Review BuildReview() => new()
    {
        Id = Guid.NewGuid(), UserId = _userId,
        ReviewType = ReviewType.Weekly,
        PeriodStart = new DateTime(2026, 3, 16), PeriodEnd = new DateTime(2026, 3, 22),
        Answers = "{}", IsComplete = false, EnergyRating = 3
    };

    [Fact]
    public async Task Handle_ShouldUpdateEnergyRating_WhenReviewExists()
    {
        var review = BuildReview();
        _uow.Reviews.GetByIdAsync(review.Id, Arg.Any<CancellationToken>()).Returns(review);

        var result = await _handler.Handle(
            new UpdateReviewCommand(review.Id, 5, null, null), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.EnergyRating.ShouldBe(5);
    }

    [Fact]
    public async Task Handle_ShouldReturnReviewNotFound_WhenReviewDoesNotExist()
    {
        _uow.Reviews.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Review?)null);

        var result = await _handler.Handle(
            new UpdateReviewCommand(Guid.NewGuid(), 5, null, null), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnReviewNotFound_WhenReviewBelongsToDifferentUser()
    {
        var review = BuildReview();
        review.UserId = Guid.NewGuid(); // different user
        _uow.Reviews.GetByIdAsync(review.Id, Arg.Any<CancellationToken>()).Returns(review);

        var result = await _handler.Handle(
            new UpdateReviewCommand(review.Id, 5, null, null), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }
}
