using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YearPlanningApp.API.Models;
using YearPlanningApp.Application.Analytics;
using YearPlanningApp.Domain.Enums;

namespace YearPlanningApp.API.Controllers;

[ApiController]
[Route("api/v1/analytics")]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly IMediator _mediator;

    public AnalyticsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>POST /api/v1/analytics/page-session/start — authenticated users</summary>
    [HttpPost("page-session/start")]
    public async Task<IActionResult> StartSession(
        [FromBody] StartSessionRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(
            new StartPageSessionCommand(request.Page, request.DeviceType), ct);
        return result.Match(
            dto => (IActionResult)Ok(Envelope.Success(dto)),
            err => BadRequest(Envelope.ValidationError(err))
        );
    }

    /// <summary>POST /api/v1/analytics/page-session/end — authenticated users</summary>
    [HttpPost("page-session/end")]
    public async Task<IActionResult> EndSession(
        [FromBody] EndSessionRequest request, CancellationToken ct)
    {
        var exitType = Enum.TryParse<PageExitType>(request.ExitType, ignoreCase: true, out var parsed)
            ? parsed : PageExitType.Unknown;
        var result = await _mediator.Send(
            new EndPageSessionCommand(request.SessionId, exitType), ct);
        return result.Match(
            dto => (IActionResult)Ok(Envelope.Success(dto)),
            notFound => NotFound(Envelope.NotFound(notFound))
        );
    }

    /// <summary>POST /api/v1/analytics/action — authenticated users</summary>
    [HttpPost("action")]
    public async Task<IActionResult> LogAction(
        [FromBody] LogActionRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new LogUserActionCommand(
            request.PageSessionId, request.Page, request.ActionType,
            request.ActionLabel, request.Metadata), ct);
        return result.Match(
            _ => (IActionResult)Ok(Envelope.Success(new { logged = true })),
            err => BadRequest(Envelope.ValidationError(err))
        );
    }

    /// <summary>GET /api/v1/analytics/pages?page=...&amp;fromDate=&amp;toDate= — admin only</summary>
    [HttpGet("pages")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetPageAnalytics(
        [FromQuery] string page,
        [FromQuery] DateTimeOffset? fromDate,
        [FromQuery] DateTimeOffset? toDate,
        CancellationToken ct)
    {
        var from = (fromDate ?? DateTimeOffset.UtcNow.AddDays(-30)).ToUniversalTime();
        var to   = (toDate   ?? DateTimeOffset.UtcNow).ToUniversalTime();
        var result = await _mediator.Send(new GetPageAnalyticsQuery(page, from, to), ct);
        return Ok(Envelope.Success(result));
    }

    /// <summary>GET /api/v1/analytics/users/{userId}/journey — admin only</summary>
    [HttpGet("users/{userId:guid}/journey")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetUserJourney(
        Guid userId,
        [FromQuery] DateTimeOffset? fromDate,
        [FromQuery] DateTimeOffset? toDate,
        CancellationToken ct)
    {
        var from = (fromDate ?? DateTimeOffset.UtcNow.AddDays(-30)).ToUniversalTime();
        var to   = (toDate   ?? DateTimeOffset.UtcNow).ToUniversalTime();
        var result = await _mediator.Send(new GetUserJourneyQuery(userId, from, to), ct);
        return Ok(Envelope.Success(result));
    }
}

public record StartSessionRequest(string Page, string? DeviceType);
public record EndSessionRequest(Guid SessionId, string ExitType);
public record LogActionRequest(
    Guid PageSessionId, string Page, string ActionType,
    string? ActionLabel, string? Metadata);
