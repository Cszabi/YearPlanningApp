using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using YearPlanningApp.API.Models;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Enums;

namespace YearPlanningApp.API.Controllers;

[ApiController]
[Authorize]
[EnableRateLimiting("general")]
public class TasksController : ControllerBase
{
    private readonly IMediator _mediator;

    public TasksController(IMediator mediator) => _mediator = mediator;

    // GET /api/v1/tasks/today
    [HttpGet("api/v1/tasks/today")]
    public async Task<IActionResult> GetTodaysTasks(CancellationToken ct)
    {
        var tasks = await _mediator.Send(new GetTodaysTasksQuery(), ct);
        return Ok(Envelope.Success(tasks));
    }

    // POST /api/v1/goals/{goalId}/milestones/{milestoneId}/tasks
    [HttpPost("api/v1/goals/{goalId:guid}/milestones/{milestoneId:guid}/tasks")]
    public async Task<IActionResult> CreateTask(
        Guid goalId, Guid milestoneId, [FromBody] CreateTaskRequest body, CancellationToken ct)
    {
        var command = new CreateTaskCommand(
            goalId,
            milestoneId,
            body.Year,
            body.Title,
            Enum.Parse<EnergyLevel>(body.EnergyLevel, true),
            body.EstimatedMinutes,
            body.DueDate,
            body.IsNextAction);

        var result = await _mediator.Send(command, ct);
        return result.Match(
            task => Ok(Envelope.Success(task)),
            notFound => (IActionResult)NotFound(Envelope.NotFound(notFound))
        );
    }

    // PATCH /api/v1/tasks/{id}/status
    [HttpPatch("api/v1/tasks/{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateTaskStatusRequest body, CancellationToken ct)
    {
        var command = new UpdateTaskStatusCommand(id, Enum.Parse<TaskItemStatus>(body.Status, true));
        var result = await _mediator.Send(command, ct);
        return result.Match(
            task => Ok(Envelope.Success(task)),
            notFound => (IActionResult)NotFound(Envelope.NotFound(notFound))
        );
    }

    // PATCH /api/v1/tasks/{id}/next-action
    [HttpPatch("api/v1/tasks/{id:guid}/next-action")]
    public async Task<IActionResult> SetNextAction(Guid id, [FromBody] SetNextActionRequest body, CancellationToken ct)
    {
        var command = new SetNextActionCommand(id, body.IsNextAction);
        var result = await _mediator.Send(command, ct);
        return result.Match(
            task => Ok(Envelope.Success(task)),
            notFound => (IActionResult)NotFound(Envelope.NotFound(notFound))
        );
    }

    // PUT /api/v1/tasks/{id}
    [HttpPut("api/v1/tasks/{id:guid}")]
    public async Task<IActionResult> UpdateTask(Guid id, [FromBody] UpdateTaskRequest body, CancellationToken ct)
    {
        var command = new UpdateTaskCommand(id, body.Title, body.DueDate, body.IsNextAction, body.Status);
        var result = await _mediator.Send(command, ct);
        return result.Match(
            task => Ok(Envelope.Success(task)),
            notFound => (IActionResult)NotFound(Envelope.NotFound(notFound))
        );
    }

    // DELETE /api/v1/tasks/{id}
    [HttpDelete("api/v1/tasks/{id:guid}")]
    public async Task<IActionResult> DeleteTask(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new DeleteTaskCommand(id), ct);
        return result.Match(
            _ => Ok(Envelope.Success("Task deleted.")),
            notFound => (IActionResult)NotFound(Envelope.NotFound(notFound))
        );
    }
}

// ── Request models ────────────────────────────────────────────────────────────
public record CreateTaskRequest(
    int Year,
    string Title,
    string EnergyLevel,
    int? EstimatedMinutes,
    DateTime? DueDate,
    bool IsNextAction);

public record UpdateTaskStatusRequest(string Status);
public record SetNextActionRequest(bool IsNextAction);
public record UpdateTaskRequest(string? Title, DateTime? DueDate, bool? IsNextAction, string? Status);
