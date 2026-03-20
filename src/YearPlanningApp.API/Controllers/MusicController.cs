using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YearPlanningApp.API.Models;
using YearPlanningApp.Application.Common.Interfaces;

namespace YearPlanningApp.API.Controllers;

[ApiController]
[Route("api/v1/music")]
[Authorize]
public class MusicController : ControllerBase
{
    private readonly IFocusMusicService _music;

    public MusicController(IFocusMusicService music) => _music = music;

    /// <summary>GET /api/v1/music/focus-tracks — returns shuffled ambient/focus tracks from Jamendo CC catalog</summary>
    [HttpGet("focus-tracks")]
    public async Task<IActionResult> GetFocusTracks(CancellationToken ct)
    {
        var tracks = await _music.GetTracksAsync(ct);
        // Shuffle server-side so each call gets a fresh random order
        var shuffled = tracks.OrderBy(_ => Guid.NewGuid()).ToList();
        return Ok(Envelope.Success(shuffled));
    }
}
