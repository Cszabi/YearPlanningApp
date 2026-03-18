using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using YearPlanningApp.API.Models;
using YearPlanningApp.Application.MindMap;
using YearPlanningApp.Domain.Enums;

namespace YearPlanningApp.API.Controllers;

[ApiController]
[Route("api/v1/mind-maps")]
[Authorize]
[EnableRateLimiting("general")]
public class MindMapController : ControllerBase
{
    private readonly IMediator _mediator;

    public MindMapController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // GET /api/v1/mind-maps/{year}
    [HttpGet("{year:int}")]
    public async Task<IActionResult> GetMindMap(int year, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetMindMapQuery(year), ct);
        return result.Match(
            map => Ok(Envelope.Success(map)),
            notFound => (IActionResult)NotFound(Envelope.NotFound(notFound))
        );
    }

    // POST /api/v1/mind-maps/{year}
    [HttpPost("{year:int}")]
    public async Task<IActionResult> CreateMindMap(int year, CancellationToken ct)
    {
        var result = await _mediator.Send(new CreateMindMapCommand(year), ct);
        return result.Match(
            map => CreatedAtAction(nameof(GetMindMap), new { year }, Envelope.Success(map)),
            conflict => (IActionResult)Conflict(Envelope.Conflict(conflict.Message))
        );
    }

    // POST /api/v1/mind-maps/{year}/nodes
    [HttpPost("{year:int}/nodes")]
    public async Task<IActionResult> AddNode(int year, [FromBody] AddNodeRequest body, CancellationToken ct)
    {
        var command = new AddNodeCommand(
            year,
            body.ParentNodeId,
            Enum.Parse<MindMapNodeType>(body.NodeType, true),
            body.Label,
            body.PositionX,
            body.PositionY);

        var result = await _mediator.Send(command, ct);
        return result.Match(
            node => Ok(Envelope.Success(node)),
            notFound => (IActionResult)NotFound(Envelope.NotFound(notFound)),
            error => BadRequest(Envelope.ValidationError(error))
        );
    }

    // PUT /api/v1/mind-maps/{year}/nodes/{nodeId}
    [HttpPut("{year:int}/nodes/{nodeId:guid}")]
    public async Task<IActionResult> UpdateNode(int year, Guid nodeId, [FromBody] UpdateNodeRequest body, CancellationToken ct)
    {
        var command = new UpdateNodeCommand(year, nodeId, body.Label, body.Notes, body.PositionX, body.PositionY, body.IkigaiCategory, body.Icon, body.LifeArea);
        var result = await _mediator.Send(command, ct);
        return result.Match(
            node => Ok(Envelope.Success(node)),
            notFound => (IActionResult)NotFound(Envelope.NotFound(notFound))
        );
    }

    // DELETE /api/v1/mind-maps/{year}/nodes/{nodeId}
    [HttpDelete("{year:int}/nodes/{nodeId:guid}")]
    public async Task<IActionResult> DeleteNode(int year, Guid nodeId, CancellationToken ct)
    {
        var result = await _mediator.Send(new DeleteNodeCommand(year, nodeId), ct);
        return result.Match(
            _ => (IActionResult)NoContent(),
            notFound => NotFound(Envelope.NotFound(notFound))
        );
    }

    // PATCH /api/v1/mind-maps/{year}/nodes/positions
    [HttpPatch("{year:int}/nodes/positions")]
    public async Task<IActionResult> SaveNodePositions(int year, [FromBody] SavePositionsRequest body, CancellationToken ct)
    {
        var positions = body.Positions
            .Select(p => new NodePositionUpdate(p.NodeId, p.X, p.Y))
            .ToList();

        var result = await _mediator.Send(new SaveNodePositionsCommand(year, positions), ct);
        return result.Match(
            _ => (IActionResult)NoContent(),
            notFound => NotFound(Envelope.NotFound(notFound))
        );
    }

    // POST /api/v1/mind-maps/{year}/nodes/{nodeId}/convert-to-goal
    [HttpPost("{year:int}/nodes/{nodeId:guid}/convert-to-goal")]
    public async Task<IActionResult> ConvertToGoal(int year, Guid nodeId, [FromBody] ConvertToGoalRequest body, CancellationToken ct)
    {
        var command = new ConvertNodeToGoalCommand(
            year,
            nodeId,
            Enum.Parse<GoalType>(body.GoalType, true),
            Enum.Parse<LifeArea>(body.LifeArea, true));

        var result = await _mediator.Send(command, ct);
        return result.Match(
            goal => Ok(Envelope.Success(goal)),
            notFound => (IActionResult)NotFound(Envelope.NotFound(notFound)),
            error => BadRequest(Envelope.ValidationError(error))
        );
    }
}

public record AddNodeRequest(Guid? ParentNodeId, string NodeType, string Label, double PositionX, double PositionY);
public record UpdateNodeRequest(string? Label, string? Notes, double? PositionX, double? PositionY, string? IkigaiCategory, string? Icon, string? LifeArea);
public record SavePositionsRequest(List<PositionItem> Positions);
public record PositionItem(Guid NodeId, double X, double Y);
public record ConvertToGoalRequest(string GoalType, string LifeArea);
