using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Infrastructure.Settings;

namespace YearPlanningApp.Infrastructure.Services;

/// <summary>
/// Fetches CC-licensed ambient/focus tracks from the Openverse API.
/// Uses OAuth2 client_credentials flow — credentials are stored in OpenverseSettings.
/// Tokens are cached in IMemoryCache and refreshed automatically when they expire.
/// https://api.openverse.org/v1/
/// </summary>
public class OpenverseMusicService : IFocusMusicService
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly IMemoryCache _cache;
    private readonly OpenverseSettings _settings;

    private const string TracksCacheKey = "openverse_focus_tracks";
    private const string TokenCacheKey  = "openverse_access_token";

    private static readonly string[] Queries =
        ["ambient instrumental", "ambient meditation", "focus music", "lofi relaxing"];

    public OpenverseMusicService(
        IHttpClientFactory httpFactory,
        IMemoryCache cache,
        IOptions<OpenverseSettings> settings)
    {
        _httpFactory = httpFactory;
        _cache       = cache;
        _settings    = settings.Value;
    }

    public async Task<IReadOnlyList<FocusTrackDto>> GetTracksAsync(CancellationToken ct = default)
    {
        if (_cache.TryGetValue<IReadOnlyList<FocusTrackDto>>(TracksCacheKey, out var cached) && cached is not null)
            return cached;

        var token = await GetAccessTokenAsync(ct);

        var seen   = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var tracks = new List<FocusTrackDto>();

        using var http = _httpFactory.CreateClient();
        if (!string.IsNullOrEmpty(token))
            http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

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
                    if (r.Duration is null || r.Duration.Value < 60_000) continue; // skip nulls and < 60 s (duration is in ms)
                    if (!seen.Add(r.Id)) continue;                                 // deduplicate

                    tracks.Add(new FocusTrackDto(
                        r.Id,
                        r.Title ?? "Untitled",
                        r.Creator ?? "Unknown artist",
                        r.Url,
                        r.Duration.Value / 1000));                                 // ms → seconds
                }
            }
            catch
            {
                // One failed query should not abort the rest
            }
        }

        var result = tracks.AsReadOnly();
        if (result.Count > 0)
            _cache.Set(TracksCacheKey, (IReadOnlyList<FocusTrackDto>)result, TimeSpan.FromHours(2));

        return result;
    }

    // ── Token acquisition ──────────────────────────────────────────────────────

    private async Task<string?> GetAccessTokenAsync(CancellationToken ct)
    {
        if (_cache.TryGetValue<string>(TokenCacheKey, out var cachedToken) && cachedToken is not null)
            return cachedToken;

        if (string.IsNullOrEmpty(_settings.ClientId) || string.IsNullOrEmpty(_settings.ClientSecret))
            return null;  // credentials not configured — fall through to anonymous (may fail)

        try
        {
            using var http = _httpFactory.CreateClient();
            var form = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"]    = "client_credentials",
                ["client_id"]     = _settings.ClientId,
                ["client_secret"] = _settings.ClientSecret,
            });

            var resp = await http.PostAsync("https://api.openverse.org/v1/auth_tokens/token/", form, ct);
            resp.EnsureSuccessStatusCode();

            var tokenResp = await resp.Content.ReadFromJsonAsync<OpenverseTokenResponse>(cancellationToken: ct);
            if (tokenResp?.AccessToken is null) return null;

            // Cache with a 60-second safety buffer before actual expiry
            var ttl = TimeSpan.FromSeconds(Math.Max(tokenResp.ExpiresIn - 60, 60));
            _cache.Set(TokenCacheKey, tokenResp.AccessToken, ttl);
            return tokenResp.AccessToken;
        }
        catch
        {
            return null;  // token fetch failed — API call will likely return 401, handled by caller
        }
    }

    // ── JSON models ────────────────────────────────────────────────────────────

    private record OpenverseTokenResponse(
        [property: JsonPropertyName("access_token")] string? AccessToken,
        [property: JsonPropertyName("expires_in")]   int     ExpiresIn);

    private record OpenverseResponse(
        [property: JsonPropertyName("results")] List<OpenverseTrack> Results);

    private record OpenverseTrack(
        [property: JsonPropertyName("id")]       string  Id,
        [property: JsonPropertyName("title")]    string? Title,
        [property: JsonPropertyName("creator")]  string? Creator,
        [property: JsonPropertyName("url")]      string? Url,
        [property: JsonPropertyName("duration")] int?    Duration);  // nullable — some tracks omit this field
}
