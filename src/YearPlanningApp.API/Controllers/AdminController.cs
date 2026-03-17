using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YearPlanningApp.API.Models;
using YearPlanningApp.Application.Admin;

namespace YearPlanningApp.API.Controllers;

[ApiController]
[Route("api/v1/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminController : ControllerBase
{
    private readonly IMediator _mediator;

    public AdminController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetUsersQuery(), ct);
        return result.Match(
            users => Ok(Envelope.Success(users)),
            error => (IActionResult)Unauthorized(Envelope.Unauthorized(error.Message))
        );
    }

    [HttpGet("users/{id:guid}")]
    public async Task<IActionResult> GetUser(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetUserDetailQuery(id), ct);
        return result.Match(
            user => Ok(Envelope.Success(user)),
            notFound => (IActionResult)NotFound(Envelope.NotFound(notFound)),
            error => Unauthorized(Envelope.Unauthorized(error.Message))
        );
    }

    [HttpDelete("users/{id:guid}")]
    public async Task<IActionResult> DeleteUser(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new DeleteUserCommand(id), ct);
        return result.Match(
            _ => (IActionResult)NoContent(),
            notFound => NotFound(Envelope.NotFound(notFound)),
            error => Unauthorized(Envelope.Unauthorized(error.Message))
        );
    }

    [HttpPut("users/{id:guid}/plan")]
    public async Task<IActionResult> UpdateUserPlan(Guid id, [FromBody] UpdatePlanRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new UpdateUserPlanCommand(id, request.Plan), ct);
        return result.Match(
            user => Ok(Envelope.Success(user)),
            notFound => (IActionResult)NotFound(Envelope.NotFound(notFound)),
            error => Unauthorized(Envelope.Unauthorized(error.Message)),
            valError => BadRequest(Envelope.ValidationError(valError))
        );
    }
}

public record UpdatePlanRequest(string Plan);
