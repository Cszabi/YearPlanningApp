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
}
