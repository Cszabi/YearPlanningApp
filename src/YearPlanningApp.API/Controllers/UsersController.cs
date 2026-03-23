using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YearPlanningApp.API.Models;
using YearPlanningApp.Application.Onboarding;
using YearPlanningApp.Domain.Enums;

namespace YearPlanningApp.API.Controllers;

[ApiController]
[Route("api/v1/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IMediator _mediator;

    public UsersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // PATCH /api/v1/users/me/onboarding-status
    [HttpPatch("me/onboarding-status")]
    public async Task<IActionResult> UpdateOnboardingStatus(
        [FromBody] UpdateOnboardingStatusRequest req, CancellationToken ct)
    {
        if (!Enum.TryParse<OnboardingStatus>(req.Status, true, out var status))
            return BadRequest(Envelope.Error("Invalid onboarding status value.", "VALIDATION_ERROR"));

        await _mediator.Send(new UpdateOnboardingStatusCommand(status), ct);
        return Ok(Envelope.Success<object?>(null));
    }
}

public record UpdateOnboardingStatusRequest(string Status);
