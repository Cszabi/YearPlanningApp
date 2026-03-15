using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YearPlanningApp.API.Models;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Enums;

namespace YearPlanningApp.API.Controllers;

[ApiController]
[Route("api/v1/habits")]
[Authorize]
public class HabitsController : ControllerBase
{
    private readonly IMediator _mediator;

    public HabitsController(IMediator mediator) => _mediator = mediator;

    // GET /api/v1/habits?year=
    [HttpGet]
    public async Task<IActionResult> GetHabits([FromQuery] int year, CancellationToken ct)
    {
        var habits = await _mediator.Send(new GetHabitsQuery(year), ct);
        return Ok(Envelope.Success(habits));
    }

    // POST /api/v1/habits
    [HttpPost]
    public async Task<IActionResult> CreateHabit([FromBody] CreateHabitRequest body, CancellationToken ct)
    {
        var command = new CreateHabitCommand(
            body.GoalId,
            body.Year,
            body.Title,
            Enum.Parse<HabitFrequency>(body.Frequency, true),
            body.MinimumViableDose,
            body.IdealDose,
            body.Trigger,
            body.CelebrationRitual,
            Enum.Parse<HabitTrackingMethod>(body.TrackingMethod, true));

        var result = await _mediator.Send(command, ct);
        return result.Match(
            habit => Ok(Envelope.Success(habit)),
            notFound => (IActionResult)NotFound(Envelope.NotFound(notFound)),
            error => BadRequest(Envelope.ValidationError(error))
        );
    }

    // POST /api/v1/habits/{id}/log
    [HttpPost("{id:guid}/log")]
    public async Task<IActionResult> LogHabit(Guid id, [FromBody] LogHabitRequest body, CancellationToken ct)
    {
        var result = await _mediator.Send(new LogHabitCommand(id, body.Notes, body.DurationMinutes), ct);
        return result.Match(
            habit => Ok(Envelope.Success(habit)),
            notFound => (IActionResult)NotFound(Envelope.NotFound(notFound))
        );
    }
}

// ── Request models ────────────────────────────────────────────────────────────
public record CreateHabitRequest(
    Guid GoalId,
    int Year,
    string Title,
    string Frequency,
    string MinimumViableDose,
    string? IdealDose,
    string? Trigger,
    string? CelebrationRitual,
    string TrackingMethod);

public record LogHabitRequest(string? Notes, int? DurationMinutes);
