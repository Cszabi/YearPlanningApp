using Mediator;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Reviews;

public record UpsertReviewCommand(
    string ReviewType,
    string PeriodStart,
    int? EnergyRating,
    ReviewAnswersDto Answers,
    bool IsComplete)
    : ICommand<ReviewDto>, IAuthenticatedCommand;

public class UpsertReviewCommandHandler
    : ICommandHandler<UpsertReviewCommand, ReviewDto>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public UpsertReviewCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<ReviewDto> Handle(UpsertReviewCommand cmd, CancellationToken ct)
    {
        var reviewType = Enum.Parse<ReviewType>(cmd.ReviewType, true);
        var periodStart = DateTime.Parse(cmd.PeriodStart, null, System.Globalization.DateTimeStyles.AssumeUniversal).ToUniversalTime();
        var periodEnd   = periodStart.AddDays(6);

        var existing = await _uow.Reviews.GetByTypeAndPeriodAsync(
            _currentUser.UserId, reviewType, periodStart, ct);

        if (existing is null)
        {
            existing = new Review
            {
                UserId      = _currentUser.UserId,
                ReviewType  = reviewType,
                PeriodStart = periodStart,
                PeriodEnd   = periodEnd,
                Answers     = ReviewMappings.SerializeAnswers(cmd.Answers),
                EnergyRating = cmd.EnergyRating,
                IsComplete  = cmd.IsComplete,
                CompletedAt = cmd.IsComplete ? DateTime.UtcNow : null,
            };
            await _uow.Reviews.AddAsync(existing, ct);
        }
        else
        {
            existing.Answers      = ReviewMappings.SerializeAnswers(cmd.Answers);
            existing.EnergyRating = cmd.EnergyRating;
            if (cmd.IsComplete && !existing.IsComplete)
            {
                existing.IsComplete  = true;
                existing.CompletedAt = DateTime.UtcNow;
            }
            existing.UpdatedAt = DateTime.UtcNow;
            _uow.Reviews.Update(existing);
        }

        await _uow.SaveChangesAsync(ct);
        return existing.ToDto();
    }
}
