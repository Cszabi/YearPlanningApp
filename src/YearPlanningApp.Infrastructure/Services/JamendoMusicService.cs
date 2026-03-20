using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Infrastructure.Settings;

namespace YearPlanningApp.Infrastructure.Services;

public class JamendoMusicService : IFocusMusicService
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly JamendoSettings _settings;
    private readonly IMemoryCache _cache;
    private const string CacheKey = "jamendo_focus_tracks";

    public JamendoMusicService(IHttpClientFactory httpFactory, IOptions<JamendoSettings> settings, IMemoryCache cache)
    {
        _httpFactory = httpFactory;
        _settings = settings.Value;
        _cache = cache;
    }

    public async Task<IReadOnlyList<FocusTrackDto>> GetTracksAsync(CancellationToken ct = default)
    {
        if (_cache.TryGetValue<IReadOnlyList<FocusTrackDto>>(CacheKey, out var cached) && cached is not null)
            return cached;

        var url = $"https://api.jamendo.com/v3.0/tracks/?client_id={_settings.ClientId}" +
                  "&format=json&limit=50&tags=ambient+meditation+focus+relax+study" +
                  "&audioformat=mp32&fuzzytags=1&include=musicinfo&order=popularity_total";

        try
        {
            using var http = _httpFactory.CreateClient();
            var response = await http.GetFromJsonAsync<JamendoResponse>(url, ct);
            var tracks = response?.Results
                .Where(t => !string.IsNullOrEmpty(t.Audio) && t.Duration > 60)
                .Select(t => new FocusTrackDto(t.Id, t.Name, t.ArtistName, t.Audio!, t.Duration))
                .ToList()
                .AsReadOnly() ?? (IReadOnlyList<FocusTrackDto>)[];

            _cache.Set(CacheKey, tracks, TimeSpan.FromHours(1));
            return tracks;
        }
        catch
        {
            return [];
        }
    }

    // ── Jamendo JSON models ────────────────────────────────────────────────────
    private record JamendoResponse(
        [property: JsonPropertyName("results")] List<JamendoTrack> Results);

    private record JamendoTrack(
        [property: JsonPropertyName("id")]          string Id,
        [property: JsonPropertyName("name")]        string Name,
        [property: JsonPropertyName("artist_name")] string ArtistName,
        [property: JsonPropertyName("audio")]       string? Audio,
        [property: JsonPropertyName("duration")]    int Duration);
}
