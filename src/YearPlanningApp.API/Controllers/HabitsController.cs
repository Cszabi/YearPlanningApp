using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using YearPlanningApp.API.Models;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Enums;

namespace YearPlanningApp.API.Controllers;

[ApiController]
[Route("api/v1/habits")]
[Authorize]
[EnableRateLimiting("general")]
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
            Enum.Parse<HabitTrackingMethod>(body.TrackingMethod, true),
            body.NotificationEnabled,
            body.ReminderHour,
            body.ReminderMinute);

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

    // DELETE /api/v1/habits/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteHabit(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new DeleteHabitCommand(id), ct);
        return result.Match<IActionResult>(
            _ => NoContent(),
            notFound => NotFound(Envelope.NotFound(notFound))
        );
    }

    // PATCH /api/v1/habits/{id}/notification
    [HttpPatch("{id:guid}/notification")]
    public async Task<IActionResult> UpdateNotification(
        Guid id,
        [FromBody] UpdateHabitNotificationRequest req,
        CancellationToken ct)
    {
        var cmd = new UpdateHabitNotificationCommand(id, req.NotificationEnabled, req.ReminderHour, req.ReminderMinute);
        var result = await _mediator.Send(cmd, ct);
        return result.Match<IActionResult>(
            dto    => Ok(Envelope.Success(dto)),
            err    => BadRequest(Envelope.ValidationError(err)),
            _      => NotFound()
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
    string TrackingMethod,
    bool NotificationEnabled = false,
    int? ReminderHour = null,
    int? ReminderMinute = null);

public record LogHabitRequest(string? Notes, int? DurationMinutes);
public record UpdateHabitNotificationRequest(bool NotificationEnabled, int? ReminderHour, int? ReminderMinute);
