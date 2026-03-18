using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using YearPlanningApp.API.Models;
using YearPlanningApp.Application.Notifications;
using YearPlanningApp.Infrastructure.Settings;

namespace YearPlanningApp.API.Controllers;

[ApiController]
[Route("api/v1/notifications")]
[Authorize]
[EnableRateLimiting("general")]
public class NotificationsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly VapidSettings _vapid;

    public NotificationsController(IMediator mediator, IOptions<VapidSettings> vapidOptions)
    {
        _mediator = mediator;
        _vapid = vapidOptions.Value;
    }

    // GET /api/v1/notifications/vapid-public-key
    [HttpGet("vapid-public-key")]
    [AllowAnonymous]
    public IActionResult GetVapidPublicKey()
        => Ok(Envelope.Success(new { publicKey = _vapid.PublicKey }));

    // POST /api/v1/notifications/subscribe
    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe(
        [FromBody] SubscribeRequest body, CancellationToken ct)
    {
        var command = new SubscribePushCommand(body.Endpoint, body.P256dh, body.Auth, body.UserAgent);
        var result = await _mediator.Send(command, ct);
        return result.Match(
            _ => (IActionResult)Ok(Envelope.Success<object?>(null)),
            error => BadRequest(Envelope.ValidationError(error))
        );
    }

    // DELETE /api/v1/notifications/unsubscribe
    [HttpDelete("unsubscribe")]
    public async Task<IActionResult> Unsubscribe(
        [FromBody] UnsubscribeRequest body, CancellationToken ct)
    {
        var command = new UnsubscribePushCommand(body.Endpoint);
        var result = await _mediator.Send(command, ct);
        return result.Match(
            _ => (IActionResult)Ok(Envelope.Success<object?>(null)),
            error => BadRequest(Envelope.ValidationError(error))
        );
    }

    // GET /api/v1/notifications/preferences
    [HttpGet("preferences")]
    public async Task<IActionResult> GetPreferences(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetNotificationPreferenceQuery(), ct);
        return result.Match(
            dto => (IActionResult)Ok(Envelope.Success(dto)),
            notFound => NotFound(Envelope.NotFound(notFound))
        );
    }

    // PUT /api/v1/notifications/preferences
    [HttpPut("preferences")]
    public async Task<IActionResult> UpsertPreferences(
        [FromBody] UpsertNotificationPreferenceCommand body, CancellationToken ct)
    {
        var result = await _mediator.Send(body, ct);
        return result.Match(
            _ => (IActionResult)Ok(Envelope.Success<object?>(null)),
            error => BadRequest(Envelope.ValidationError(error))
        );
    }
}

public record SubscribeRequest(string Endpoint, string P256dh, string Auth, string? UserAgent);
public record UnsubscribeRequest(string Endpoint);
