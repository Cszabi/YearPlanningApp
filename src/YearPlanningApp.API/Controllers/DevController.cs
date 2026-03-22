using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using YearPlanningApp.API.Models;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.API.Controllers;

/// <summary>
/// Development-only endpoints. Returns 404 in production.
/// </summary>
[ApiController]
[Route("api/v1/dev")]
public class DevController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly IUnitOfWork _uow;

    public DevController(IWebHostEnvironment env, IUnitOfWork uow)
    {
        _env = env;
        _uow = uow;
    }

    /// <summary>
    /// Returns the email address of the most recently registered unverified user.
    /// Use this to identify which log entry contains the verification URL.
    /// Only available in Development environment.
    /// </summary>
    [HttpGet("latest-verification-token")]
    public async Task<IActionResult> LatestVerificationToken(CancellationToken ct)
    {
        if (!_env.IsDevelopment()) return NotFound();

        var users = await _uow.Users.GetAllAsync(ct);
        var latest = users
            .Where(u => !u.IsEmailVerified && u.EmailVerificationTokenHash != null)
            .OrderByDescending(u => u.CreatedAt)
            .FirstOrDefault();

        if (latest is null)
            return NotFound(Envelope.Error("No unverified users found.", "NOT_FOUND"));

        return Ok(Envelope.Success(new
        {
            email = latest.Email,
            expiresAt = latest.EmailVerificationTokenExpiresAt,
            note = "Check server logs for the full verification URL."
        }));
    }
}
