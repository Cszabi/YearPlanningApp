using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using YearPlanningApp.API.Models;
using YearPlanningApp.Application.FlowSessions;

namespace YearPlanningApp.API.Controllers;

[ApiController]
[Route("api/v1/flow-sessions")]
[Authorize]
[EnableRateLimiting("general")]
public class FlowSessionsController : ControllerBase
{
    private readonly IMediator _mediator;

    public FlowSessionsController(IMediator mediator) => _mediator = mediator;

    // GET /api/v1/flow-sessions/active
    [HttpGet("active")]
    public async Task<IActionResult> GetActive(CancellationToken ct)
    {
        var session = await _mediator.Send(new GetActiveFlowSessionQuery(), ct);
        return Ok(Envelope.Success(session));
    }

    // GET /api/v1/flow-sessions/insights
    [HttpGet("insights")]
    public async Task<IActionResult> GetInsights(CancellationToken ct)
    {
        var insights = await _mediator.Send(new GetFlowInsightsQuery(), ct);
        return Ok(Envelope.Success(insights));
    }

    // GET /api/v1/flow-sessions?year=
    [HttpGet]
    public async Task<IActionResult> GetSessions([FromQuery] int year, CancellationToken ct)
    {
        var sessions = await _mediator.Send(new GetFlowSessionsQuery(year), ct);
        return Ok(Envelope.Success(sessions));
    }

    // POST /api/v1/flow-sessions
    [HttpPost]
    public async Task<IActionResult> CreateSession([FromBody] CreateFlowSessionRequest body, CancellationToken ct)
    {
        var command = new CreateFlowSessionCommand(
            body.GoalId,
            body.TaskItemId,
            body.SessionIntention,
            body.PlannedMinutes,
            body.EnergyLevel,
            body.AmbientSound);

        var result = await _mediator.Send(command, ct);
        return result.Match(
            session => CreatedAtAction(nameof(GetActive), Envelope.Success(session)),
            error => (IActionResult)BadRequest(Envelope.ValidationError(error)));
    }

    // PATCH /api/v1/flow-sessions/{id}/complete
    [HttpPatch("{id:guid}/complete")]
    public async Task<IActionResult> CompleteSession(Guid id, [FromBody] CompleteSessionRequest body, CancellationToken ct)
    {
        var result = await _mediator.Send(
            new CompleteFlowSessionCommand(id, body.Outcome, body.FlowQualityRating, body.EnergyAfterRating, body.Blockers), ct);
        return result.Match(
            session => (IActionResult)Ok(Envelope.Success(session)),
            notFound => NotFound(Envelope.NotFound(notFound)),
            error => BadRequest(Envelope.ValidationError(error)));
    }

    // PATCH /api/v1/flow-sessions/{id}/interrupt
    [HttpPatch("{id:guid}/interrupt")]
    public async Task<IActionResult> InterruptSession(Guid id, [FromBody] InterruptSessionRequest body, CancellationToken ct)
    {
        var result = await _mediator.Send(new InterruptFlowSessionCommand(id, body.InterruptionReason), ct);
        return result.Match(
            session => (IActionResult)Ok(Envelope.Success(session)),
            notFound => NotFound(Envelope.NotFound(notFound)));
    }
}

// ── Request models ────────────────────────────────────────────────────────────
public record CreateFlowSessionRequest(
    Guid? GoalId,
    Guid? TaskItemId,
    string? SessionIntention,
    int PlannedMinutes,
    string EnergyLevel,
    string AmbientSound);

public record CompleteSessionRequest(
    string Outcome,
    int FlowQualityRating,
    int EnergyAfterRating,
    string? Blockers);

public record InterruptSessionRequest(string? InterruptionReason);
