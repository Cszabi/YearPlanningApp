using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using YearPlanningApp.API.Models;
using YearPlanningApp.Application.Reviews;
using YearPlanningApp.Domain.Enums;

namespace YearPlanningApp.API.Controllers;

[ApiController]
[Route("api/v1/reviews")]
[Authorize]
[EnableRateLimiting("general")]
public class ReviewsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ReviewsController(IMediator mediator) => _mediator = mediator;

    // GET /api/v1/reviews?type=Weekly&year=2026
    [HttpGet]
    public async Task<IActionResult> GetReviews(
        [FromQuery] string? type,
        [FromQuery] int? year,
        CancellationToken ct)
    {
        var reviewType = type is not null ? Enum.Parse<ReviewType>(type, true) : (ReviewType?)null;
        var reviews = await _mediator.Send(new GetReviewsQuery(reviewType, year), ct);
        return Ok(Envelope.Success(reviews));
    }

    // GET /api/v1/reviews/weekly-data?weekStartDate=2026-03-16
    [HttpGet("weekly-data")]
    public async Task<IActionResult> GetWeeklyData(
        [FromQuery] string weekStartDate,
        CancellationToken ct)
    {
        var date = DateTime.Parse(weekStartDate, null, System.Globalization.DateTimeStyles.AssumeUniversal)
                           .ToUniversalTime();
        var data = await _mediator.Send(new GetWeeklyDataQuery(date), ct);
        return Ok(Envelope.Success(data));
    }

    // GET /api/v1/reviews/{type}/{periodStart}
    [HttpGet("{type}/{periodStart}")]
    public async Task<IActionResult> GetReview(string type, string periodStart, CancellationToken ct)
    {
        var reviewType = Enum.Parse<ReviewType>(type, true);
        var date = DateTime.Parse(periodStart, null, System.Globalization.DateTimeStyles.AssumeUniversal)
                           .ToUniversalTime();
        var review = await _mediator.Send(new GetReviewQuery(reviewType, date), ct);
        return review is null ? NotFound() : Ok(Envelope.Success(review));
    }

    // POST /api/v1/reviews
    [HttpPost]
    public async Task<IActionResult> UpsertReview([FromBody] UpsertReviewRequest body, CancellationToken ct)
    {
        var review = await _mediator.Send(new UpsertReviewCommand(
            body.ReviewType,
            body.PeriodStart,
            body.EnergyRating,
            body.Answers ?? new ReviewAnswersDto(null,null,null,null,null,null,null,null,null),
            body.IsComplete ?? false), ct);
        return Ok(Envelope.Success(review));
    }

    // PUT /api/v1/reviews/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateReview(Guid id, [FromBody] UpdateReviewRequest body, CancellationToken ct)
    {
        var result = await _mediator.Send(new UpdateReviewCommand(
            id,
            body.EnergyRating,
            body.Answers,
            body.IsComplete), ct);

        return result.Match<IActionResult>(
            review => Ok(Envelope.Success(review)),
            _ => NotFound());
    }
}

public record UpsertReviewRequest(
    string ReviewType,
    string PeriodStart,
    int? EnergyRating,
    ReviewAnswersDto? Answers,
    bool? IsComplete);

public record UpdateReviewRequest(
    int? EnergyRating,
    ReviewAnswersDto? Answers,
    bool? IsComplete);
