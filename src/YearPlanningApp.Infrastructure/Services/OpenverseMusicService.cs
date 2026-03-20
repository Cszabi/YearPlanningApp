using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;
using YearPlanningApp.Application.Common.Interfaces;

namespace YearPlanningApp.Infrastructure.Services;

/// <summary>
/// Fetches CC-licensed ambient/focus tracks from the Openverse API.
/// No API key required — Openverse is a free public index of CC-licensed media.
/// https://api.openverse.org/v1/audio/
/// </summary>
public class OpenverseMusicService : IFocusMusicService
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly IMemoryCache _cache;
    private const string CacheKey = "openverse_focus_tracks";

    // Queries that cover ambient/focus/meditation music, deduplicated on server
    private static readonly string[] Queries = ["ambient instrumental", "ambient meditation", "focus music", "lofi relaxing"];

    public OpenverseMusicService(IHttpClientFactory httpFactory, IMemoryCache cache)
    {
        _httpFactory = httpFactory;
        _cache = cache;
    }

    public async Task<IReadOnlyList<FocusTrackDto>> GetTracksAsync(CancellationToken ct = default)
    {
        if (_cache.TryGetValue<IReadOnlyList<FocusTrackDto>>(CacheKey, out var cached) && cached is not null)
            return cached;

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var tracks = new List<FocusTrackDto>();

        using var http = _httpFactory.CreateClient();

        foreach (var q in Queries)
        {
            if (ct.IsCancellationRequested) break;
            try
            {
                var url = $"https://api.openverse.org/v1/audio/" +
                          $"?q={Uri.EscapeDataString(q)}&page_size=25&category=music";

                var response = await http.GetFromJsonAsync<OpenverseResponse>(url, ct);
                if (response?.Results is null) continue;

                foreach (var r in response.Results)
                {
                    if (string.IsNullOrEmpty(r.Url)) continue;
                    if (r.Duration < 60_000) continue;          // skip < 60 s (duration in ms)
                    if (!seen.Add(r.Id)) continue;              // deduplicate

                    tracks.Add(new FocusTrackDto(
                        r.Id,
                        r.Title ?? "Untitled",
                        r.Creator ?? "Unknown artist",
                        r.Url,
                        r.Duration / 1000));
                }
            }
            catch
            {
                // One failed query shouldn't abort the rest
            }
        }

        var result = tracks.AsReadOnly();
        if (result.Count > 0)
            _cache.Set(CacheKey, (IReadOnlyList<FocusTrackDto>)result, TimeSpan.FromHours(2));

        return result;
    }

    // ── Openverse JSON models ──────────────────────────────────────────────────
    private record OpenverseResponse(
        [property: JsonPropertyName("results")] List<OpenverseTrack> Results);

    private record OpenverseTrack(
        [property: JsonPropertyName("id")]       string Id,
        [property: JsonPropertyName("title")]    string? Title,
        [property: JsonPropertyName("creator")]  string? Creator,
        [property: JsonPropertyName("url")]      string? Url,
        [property: JsonPropertyName("duration")] int Duration);
}
