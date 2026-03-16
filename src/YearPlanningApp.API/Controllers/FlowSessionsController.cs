using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace YearPlanningApp.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[EnableRateLimiting("general")]
public class FlowSessionsController : ControllerBase
{
    // TODO: Implement in corresponding session prompt
}
