using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YearPlanningApp.Application.Export;

namespace YearPlanningApp.API.Controllers;

[ApiController]
[Route("api/v1/export")]
[Authorize]
public class ExportController : ControllerBase
{
    private readonly IMediator _mediator;

    public ExportController(IMediator mediator) => _mediator = mediator;

    /// <summary>
    /// Accepts a PDF file upload and emails it to the authenticated user.
    /// </summary>
    [HttpPost("email-pdf")]
    [RequestSizeLimit(11 * 1024 * 1024)] // 11 MB max
    public async Task<IActionResult> EmailPdf(
        IFormFile pdf,
        [FromForm] string subject,
        CancellationToken ct)
    {
        if (pdf is null || pdf.Length == 0)
            return BadRequest(new { error = "No PDF file provided" });

        using var ms = new MemoryStream();
        await pdf.CopyToAsync(ms, ct);

        var fileName = $"{subject.Replace(" ", "_")}_{DateTime.UtcNow:yyyyMMdd}.pdf";
        var result = await _mediator.Send(new EmailPdfCommand(ms.ToArray(), fileName, subject), ct);

        return result.Match<IActionResult>(
            _ => Ok(new { success = true }),
            err => BadRequest(new { error = err.Message }));
    }
}
