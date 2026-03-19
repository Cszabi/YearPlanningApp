using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Reviews;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Reviews;

public class UpsertReviewCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly UpsertReviewCommandHandler _handler;

    public UpsertReviewCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new UpsertReviewCommandHandler(_uow, _currentUser);
    }

    private static ReviewAnswersDto EmptyAnswers() => new(null, null, null, null, null, null, null, null, null);

    [Fact]
    public async Task Handle_ShouldCreateReview_WhenNoneExists()
    {
        _uow.Reviews.GetByTypeAndPeriodAsync(
            _userId, ReviewType.Weekly, Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns((Review?)null);
        Review? saved = null;
        await _uow.Reviews.AddAsync(Arg.Do<Review>(r => saved = r), Arg.Any<CancellationToken>());

        var result = await _handler.Handle(
            new UpsertReviewCommand("Weekly", "2026-03-16", 4, EmptyAnswers(), false),
            CancellationToken.None);

        result.ReviewType.ShouldBe("Weekly");
        saved.ShouldNotBeNull();
        saved!.UserId.ShouldBe(_userId);
    }

    [Fact]
    public async Task Handle_ShouldUpdateReview_WhenOneAlreadyExists()
    {
        var existing = new Review
        {
            Id = Guid.NewGuid(), UserId = _userId,
            ReviewType = ReviewType.Weekly, PeriodStart = new DateTime(2026, 3, 16),
            PeriodEnd = new DateTime(2026, 3, 22), Answers = "{}",
            IsComplete = false, EnergyRating = 3
        };
        _uow.Reviews.GetByTypeAndPeriodAsync(
            _userId, ReviewType.Weekly, Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns(existing);

        var result = await _handler.Handle(
            new UpsertReviewCommand("Weekly", "2026-03-16", 5, EmptyAnswers(), false),
            CancellationToken.None);

        result.EnergyRating.ShouldBe(5);
        await _uow.Reviews.DidNotReceive().AddAsync(Arg.Any<Review>(), Arg.Any<CancellationToken>());
        _uow.Reviews.Received(1).Update(existing);
    }

    [Fact]
    public async Task Handle_ShouldSetCompletedAt_OnFirstCompletion()
    {
        var existing = new Review
        {
            Id = Guid.NewGuid(), UserId = _userId, ReviewType = ReviewType.Weekly,
            PeriodStart = new DateTime(2026, 3, 16), PeriodEnd = new DateTime(2026, 3, 22),
            Answers = "{}", IsComplete = false
        };
        _uow.Reviews.GetByTypeAndPeriodAsync(
            _userId, ReviewType.Weekly, Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns(existing);

        var result = await _handler.Handle(
            new UpsertReviewCommand("Weekly", "2026-03-16", null, EmptyAnswers(), true),
            CancellationToken.None);

        result.IsComplete.ShouldBeTrue();
        existing.CompletedAt.ShouldNotBeNull();
    }
}
