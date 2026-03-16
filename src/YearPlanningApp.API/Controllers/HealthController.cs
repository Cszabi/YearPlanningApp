using Microsoft.AspNetCore.Mvc;
using YearPlanningApp.Infrastructure.Persistence;

namespace YearPlanningApp.API.Controllers;

[ApiController]
[Route("api/v1/health")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _db;

    public HealthController(AppDbContext db) { _db = db; }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var dbOk = await _db.Database.CanConnectAsync(ct);
        return Ok(new
        {
            status = dbOk ? "healthy" : "degraded",
            database = dbOk ? "ok" : "unreachable",
            timestamp = DateTime.UtcNow
        });
    }
}
