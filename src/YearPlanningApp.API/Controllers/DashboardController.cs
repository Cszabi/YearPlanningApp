using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using YearPlanningApp.API.Models;
using YearPlanningApp.Application.Dashboard;

namespace YearPlanningApp.API.Controllers;

[ApiController]
[Route("api/v1/dashboard")]
[Authorize]
[EnableRateLimiting("general")]
public class DashboardController : ControllerBase
{
    private readonly IMediator _mediator;

    public DashboardController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetDashboard(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetDashboardQuery(), ct);
        return Ok(Envelope.Success(result));
    }
}
