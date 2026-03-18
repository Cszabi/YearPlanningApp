using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using YearPlanningApp.API.Models;
using YearPlanningApp.Application.Auth;

namespace YearPlanningApp.API.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;

    public AuthController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Register([FromBody] RegisterCommand command, CancellationToken ct)
    {
        var result = await _mediator.Send(command, ct);
        return result.Match(
            auth => CreatedAtAction(nameof(Register), Envelope.Success(auth)),
            error => (IActionResult)BadRequest(Envelope.ValidationError(error)),
            conflict => Conflict(Envelope.Conflict(conflict.Message))
        );
    }

    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Login([FromBody] LoginCommand command, CancellationToken ct)
    {
        var result = await _mediator.Send(command, ct);
        return result.Match(
            auth => Ok(Envelope.Success(auth)),
            notFound => (IActionResult)Unauthorized(Envelope.Error("Invalid email or password.", "INVALID_CREDENTIALS")),
            error => BadRequest(Envelope.ValidationError(error))
        );
    }

    [HttpPost("refresh")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenCommand command, CancellationToken ct)
    {
        var result = await _mediator.Send(command, ct);
        return result.Match(
            auth => Ok(Envelope.Success(auth)),
            error => (IActionResult)Unauthorized(Envelope.Unauthorized(error.Message))
        );
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest request, CancellationToken ct)
    {
        await _mediator.Send(new LogoutCommand(request.RefreshToken), ct);
        return Ok(Envelope.Success<object?>(null));
    }

    /// <summary>
    /// Permanently deletes the authenticated user's account and ALL associated data (GDPR right to erasure).
    /// Requires password confirmation. This action is irreversible.
    /// </summary>
    [HttpDelete("account")]
    [Authorize]
    public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountRequest request, CancellationToken ct)
    {
        var command = new DeleteAccountCommand(request.PasswordConfirmation);
        var result = await _mediator.Send(command, ct);
        return result.Match(
            _ => (IActionResult)NoContent(),
            error => Unauthorized(Envelope.Unauthorized(error.Message))
        );
    }

    [HttpPost("forgot-password")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken ct)
    {
        await _mediator.Send(new ForgotPasswordCommand(request.Email), ct);
        return Ok(Envelope.Success<object?>(null));
    }

    [HttpPost("reset-password")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new ResetPasswordCommand(request.Token, request.NewPassword), ct);
        return result.Match(
            _ => (IActionResult)Ok(Envelope.Success<object?>(null)),
            error => Unauthorized(Envelope.Unauthorized(error.Message)),
            error => BadRequest(Envelope.ValidationError(error))
        );
    }
}

public record LogoutRequest(string RefreshToken);
public record DeleteAccountRequest(string PasswordConfirmation);
public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(string Token, string NewPassword);
