using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YearPlanningApp.API.Models;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Enums;

namespace YearPlanningApp.API.Controllers;

[ApiController]
[Route("api/v1/goals")]
[Authorize]
public class GoalsController : ControllerBase
{
    private readonly IMediator _mediator;

    public GoalsController(IMediator mediator) => _mediator = mediator;

    // GET /api/v1/goals?year=&lifeArea=&status=
    [HttpGet]
    public async Task<IActionResult> GetGoals(
        [FromQuery] int year,
        [FromQuery] string? lifeArea,
        [FromQuery] string? status,
        CancellationToken ct)
    {
        var la = lifeArea is not null ? Enum.Parse<LifeArea>(lifeArea, true) : (LifeArea?)null;
        var st = status is not null ? Enum.Parse<GoalStatus>(status, true) : (GoalStatus?)null;
        var goals = await _mediator.Send(new GetGoalsQuery(year, la, st), ct);
        return Ok(Envelope.Success(goals));
    }

    // POST /api/v1/goals
    [HttpPost]
    public async Task<IActionResult> CreateGoal([FromBody] CreateGoalRequest body, CancellationToken ct)
    {
        var command = new CreateGoalCommand(
            body.Year,
            body.Title,
            Enum.Parse<GoalType>(body.GoalType, true),
            Enum.Parse<LifeArea>(body.LifeArea, true),
            Enum.Parse<EnergyLevel>(body.EnergyLevel, true),
            body.WhyItMatters,
            body.TargetDate,
            body.AlignedValueNames ?? []);

        var result = await _mediator.Send(command, ct);
        return result.Match(
            goal => CreatedAtAction(nameof(GetGoalById), new { id = goal.Id, year = goal.Year }, Envelope.Success(goal)),
            error => (IActionResult)BadRequest(Envelope.ValidationError(error)),
            conflict => Conflict(Envelope.Conflict(conflict.Message))
        );
    }

    // GET /api/v1/goals/{id}?year=
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetGoalById(Guid id, [FromQuery] int year, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetGoalByIdQuery(id, year), ct);
        return result.Match(
            goal => Ok(Envelope.Success(goal)),
            notFound => (IActionResult)NotFound(Envelope.NotFound(notFound))
        );
    }

    // PUT /api/v1/goals/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateGoal(Guid id, [FromBody] UpdateGoalRequest body, CancellationToken ct)
    {
        var la = body.LifeArea is not null ? Enum.Parse<LifeArea>(body.LifeArea, true) : (LifeArea?)null;
        var el = body.EnergyLevel is not null ? Enum.Parse<EnergyLevel>(body.EnergyLevel, true) : (EnergyLevel?)null;

        var command = new UpdateGoalCommand(
            id, body.Year, body.Title, body.WhyItMatters, body.TargetDate, la, el, body.AlignedValueNames);

        var result = await _mediator.Send(command, ct);
        return result.Match(
            goal => Ok(Envelope.Success(goal)),
            notFound => (IActionResult)NotFound(Envelope.NotFound(notFound)),
            error => BadRequest(Envelope.ValidationError(error))
        );
    }

    // PATCH /api/v1/goals/{id}/status
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateStatusRequest body, CancellationToken ct)
    {
        var command = new UpdateGoalStatusCommand(id, body.Year, Enum.Parse<GoalStatus>(body.Status, true));
        var result = await _mediator.Send(command, ct);
        return result.Match(
            goal => Ok(Envelope.Success(goal)),
            notFound => (IActionResult)NotFound(Envelope.NotFound(notFound))
        );
    }

    // PUT /api/v1/goals/{id}/smart
    [HttpPut("{id:guid}/smart")]
    public async Task<IActionResult> SaveSmart(Guid id, [FromBody] SaveSmartRequest body, CancellationToken ct)
    {
        var command = new SaveSmartGoalCommand(
            id, body.Year, body.Specific, body.Measurable, body.Achievable, body.Relevant, body.TimeBound);

        var result = await _mediator.Send(command, ct);
        return result.Match(
            goal => Ok(Envelope.Success(goal)),
            notFound => (IActionResult)NotFound(Envelope.NotFound(notFound)),
            error => BadRequest(Envelope.ValidationError(error))
        );
    }

    // PUT /api/v1/goals/{id}/woop
    [HttpPut("{id:guid}/woop")]
    public async Task<IActionResult> SaveWoop(Guid id, [FromBody] SaveWoopRequest body, CancellationToken ct)
    {
        var command = new SaveWoopReflectionCommand(
            id, body.Year, body.Wish, body.Outcome, body.Obstacle, body.Plan);

        var result = await _mediator.Send(command, ct);
        return result.Match(
            goal => Ok(Envelope.Success(goal)),
            notFound => (IActionResult)NotFound(Envelope.NotFound(notFound)),
            error => BadRequest(Envelope.ValidationError(error))
        );
    }

    // POST /api/v1/goals/{id}/milestones
    [HttpPost("{id:guid}/milestones")]
    public async Task<IActionResult> CreateMilestone(Guid id, [FromBody] CreateMilestoneRequest body, CancellationToken ct)
    {
        var command = new CreateMilestoneCommand(id, body.Year, body.Title, body.TargetDate, body.OrderIndex);
        var result = await _mediator.Send(command, ct);
        return result.Match(
            milestone => Ok(Envelope.Success(milestone)),
            notFound => (IActionResult)NotFound(Envelope.NotFound(notFound))
        );
    }
}

// ── Request models ────────────────────────────────────────────────────────────
public record CreateGoalRequest(
    int Year,
    string Title,
    string GoalType,
    string LifeArea,
    string EnergyLevel,
    string? WhyItMatters,
    DateTime? TargetDate,
    string[]? AlignedValueNames);

public record UpdateGoalRequest(
    int Year,
    string? Title,
    string? WhyItMatters,
    DateTime? TargetDate,
    string? LifeArea,
    string? EnergyLevel,
    string[]? AlignedValueNames);

public record UpdateStatusRequest(int Year, string Status);

public record SaveSmartRequest(
    int Year,
    string Specific,
    string Measurable,
    string Achievable,
    string Relevant,
    DateTime TimeBound);

public record SaveWoopRequest(int Year, string Wish, string Outcome, string Obstacle, string Plan);

public record CreateMilestoneRequest(int Year, string Title, DateTime? TargetDate, int OrderIndex);
