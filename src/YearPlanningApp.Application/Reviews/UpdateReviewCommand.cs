using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Reviews;

public record UpdateReviewCommand(
    Guid Id,
    int? EnergyRating,
    ReviewAnswersDto? Answers,
    bool? IsComplete)
    : ICommand<OneOf<ReviewDto, ReviewNotFound>>, IAuthenticatedCommand;

public record ReviewNotFound;

public class UpdateReviewCommandHandler
    : ICommandHandler<UpdateReviewCommand, OneOf<ReviewDto, ReviewNotFound>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public UpdateReviewCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<ReviewDto, ReviewNotFound>> Handle(UpdateReviewCommand cmd, CancellationToken ct)
    {
        var review = await _uow.Reviews.GetByIdAsync(cmd.Id, ct);
        if (review is null || review.UserId != _currentUser.UserId)
            return new ReviewNotFound();

        if (cmd.EnergyRating.HasValue) review.EnergyRating = cmd.EnergyRating;
        if (cmd.Answers is not null)   review.Answers = ReviewMappings.SerializeAnswers(cmd.Answers);
        if (cmd.IsComplete == true && !review.IsComplete)
        {
            review.IsComplete  = true;
            review.CompletedAt = DateTime.UtcNow;
        }
        review.UpdatedAt = DateTime.UtcNow;
        _uow.Reviews.Update(review);
        await _uow.SaveChangesAsync(ct);

        return review.ToDto();
    }
}
