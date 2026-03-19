using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using YearPlanningApp.API.Models;
using YearPlanningApp.Application.Ikigai;
using YearPlanningApp.Domain.Enums;

namespace YearPlanningApp.API.Controllers;

[ApiController]
[Route("api/v1/ikigai")]
[Authorize]
[EnableRateLimiting("general")]
public class IkigaiController : ControllerBase
{
    private readonly IMediator _mediator;

    public IkigaiController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // GET /api/v1/ikigai/{year}
    [HttpGet("{year:int}")]
    public async Task<IActionResult> GetJourney(int year, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetIkigaiJourneyQuery(year), ct);
        return result.Match(
            journey => Ok(Envelope.Success(journey)),
            notFound => (IActionResult)NotFound(Envelope.NotFound(notFound))
        );
    }

    // POST /api/v1/ikigai/{year}/start
    [HttpPost("{year:int}/start")]
    public async Task<IActionResult> StartJourney(int year, CancellationToken ct)
    {
        var result = await _mediator.Send(new StartIkigaiJourneyCommand(year), ct);
        return result.Match(
            journey => CreatedAtAction(nameof(GetJourney), new { year }, Envelope.Success(journey)),
            conflict => (IActionResult)Conflict(Envelope.Conflict(conflict.Message))
        );
    }

    // PUT /api/v1/ikigai/{year}/rooms/{roomType}
    [HttpPut("{year:int}/rooms/{roomType:int}")]
    public async Task<IActionResult> SaveRoom(int year, int roomType, [FromBody] SaveRoomRequest body, CancellationToken ct)
    {
        var command = new SaveIkigaiRoomCommand(year, (IkigaiRoomType)roomType, body.Answers, body.IsComplete);
        var result = await _mediator.Send(command, ct);
        return result.Match(
            room => Ok(Envelope.Success(room)),
            notFound => (IActionResult)NotFound(Envelope.NotFound(notFound)),
            error => BadRequest(Envelope.ValidationError(error))
        );
    }

    // POST /api/v1/ikigai/{year}/complete
    [HttpPost("{year:int}/complete")]
    public async Task<IActionResult> CompleteJourney(int year, CancellationToken ct)
    {
        var result = await _mediator.Send(new CompleteIkigaiJourneyCommand(year), ct);
        return result.Match(
            journey => Ok(Envelope.Success(journey)),
            notFound => (IActionResult)NotFound(Envelope.NotFound(notFound)),
            error => BadRequest(Envelope.ValidationError(error))
        );
    }

    // GET /api/v1/ikigai/{year}/north-star
    [HttpGet("{year:int}/north-star")]
    public async Task<IActionResult> GetNorthStar(int year, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetNorthStarQuery(year), ct);
        return result.Match(
            ns => Ok(Envelope.Success(ns)),
            notFound => (IActionResult)NotFound(Envelope.NotFound(notFound))
        );
    }

    // PUT /api/v1/ikigai/{year}/north-star
    [HttpPut("{year:int}/north-star")]
    public async Task<IActionResult> SaveNorthStar(int year, [FromBody] SaveNorthStarRequest body, CancellationToken ct)
    {
        var result = await _mediator.Send(new SaveNorthStarCommand(year, body.Statement), ct);
        return result.Match(
            ns => Ok(Envelope.Success(ns)),
            error => (IActionResult)BadRequest(Envelope.ValidationError(error))
        );
    }

    // GET /api/v1/ikigai/{year}/values
    [HttpGet("{year:int}/values")]
    public async Task<IActionResult> GetValues(int year, CancellationToken ct)
    {
        var values = await _mediator.Send(new GetUserValuesQuery(year), ct);
        return Ok(Envelope.Success(values));
    }

    // PUT /api/v1/ikigai/{year}/values
    [HttpPut("{year:int}/values")]
    public async Task<IActionResult> SaveValues(int year, [FromBody] SaveUserValuesRequest body, CancellationToken ct)
    {
        var command = new SaveUserValuesCommand(year, body.Values);
        var result = await _mediator.Send(command, ct);
        return result.Match(
            values => Ok(Envelope.Success(values)),
            error => (IActionResult)BadRequest(Envelope.ValidationError(error))
        );
    }

    // POST /api/v1/ikigai/extract-themes
    [HttpPost("extract-themes")]
    public async Task<IActionResult> ExtractThemes([FromBody] ExtractThemesRequest req, CancellationToken ct)
    {
        var result = await _mediator.Send(new ExtractIkigaiThemesCommand(req.Year), ct);
        return result.Match(
            extraction => Ok(Envelope.Success(extraction)),
            notFound => (IActionResult)NotFound(Envelope.NotFound(notFound)),
            error => BadRequest(Envelope.Error(error.Message, "EXTRACTION_ERROR"))
        );
    }
}

public record SaveRoomRequest(List<string> Answers, bool IsComplete);
public record SaveNorthStarRequest(string Statement);
public record SaveUserValuesRequest(List<SaveValueItem> Values);
public record ExtractThemesRequest(int Year);
