using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using OneOf;
using YearPlanningApp.Application.Ikigai;
using YearPlanningApp.Infrastructure.Settings;

namespace YearPlanningApp.Infrastructure.Services;

public class IkigaiThemeExtractionService : IIkigaiThemeExtractionService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly AnthropicSettings _settings;

    private const string SystemPrompt =
        "You are a theme extractor for an Ikigai journey. " +
        "Analyze answers from 4 rooms (Love, World, Paid, Good) and extract 3-6 themes per category. " +
        "Return JSON only, no markdown, no extra text. " +
        "Format: {\"categories\":[{\"label\":\"What I Love\",\"themes\":[\"theme1\",\"theme2\"]},{\"label\":\"What The World Needs\",\"themes\":[...]},{\"label\":\"What I Can Be Paid For\",\"themes\":[...]},{\"label\":\"What I'm Good At\",\"themes\":[...]}]}";

    public IkigaiThemeExtractionService(IHttpClientFactory httpClientFactory, IOptions<AnthropicSettings> settings)
    {
        _httpClientFactory = httpClientFactory;
        _settings = settings.Value;
    }

    public async Task<OneOf<IkigaiExtractionResult, ExtractionError>> ExtractThemesAsync(
        IkigaiJourneyDto journey, CancellationToken ct = default)
    {
        try
        {
            var userContent = BuildUserPrompt(journey);
            var requestBody = new
            {
                model = "claude-haiku-4-5-20251001",
                max_tokens = 1024,
                system = SystemPrompt,
                messages = new[]
                {
                    new { role = "user", content = userContent }
                }
            };

            var client = _httpClientFactory.CreateClient("anthropic");
            var request = new HttpRequestMessage(HttpMethod.Post, "/v1/messages");
            request.Headers.Add("x-api-key", _settings.ApiKey);
            request.Content = new StringContent(
                JsonSerializer.Serialize(requestBody),
                Encoding.UTF8,
                "application/json");

            var response = await client.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
                return new ExtractionError($"Anthropic API returned {(int)response.StatusCode}");

            var responseJson = await response.Content.ReadAsStringAsync(ct);
            return ParseAndValidate(responseJson);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            return new ExtractionError($"Theme extraction failed: {ex.Message}");
        }
    }

    private static string BuildUserPrompt(IkigaiJourneyDto journey)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Extract themes from these Ikigai room answers:");
        foreach (var room in journey.Rooms)
        {
            sb.AppendLine($"\n{room.RoomType}:");
            foreach (var answer in room.Answers)
                sb.AppendLine($"  - {answer}");
        }
        return sb.ToString();
    }

    private static OneOf<IkigaiExtractionResult, ExtractionError> ParseAndValidate(string responseJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(responseJson);

            // Anthropic messages API wraps content in content[0].text
            string? extractedJson = null;
            if (doc.RootElement.TryGetProperty("content", out var contentArr) &&
                contentArr.GetArrayLength() > 0 &&
                contentArr[0].TryGetProperty("text", out var textEl))
            {
                extractedJson = textEl.GetString();
            }

            if (string.IsNullOrWhiteSpace(extractedJson))
                return new ExtractionError("Empty response from Anthropic API");

            using var resultDoc = JsonDocument.Parse(extractedJson);
            if (!resultDoc.RootElement.TryGetProperty("categories", out var categoriesEl))
                return new ExtractionError("Invalid JSON: missing 'categories'");

            var categories = new List<IkigaiThemeCategory>();
            foreach (var catEl in categoriesEl.EnumerateArray())
            {
                var label = catEl.TryGetProperty("label", out var labelEl) ? labelEl.GetString() ?? "" : "";
                var rawThemes = new List<string>();
                if (catEl.TryGetProperty("themes", out var themesEl))
                {
                    foreach (var themeEl in themesEl.EnumerateArray())
                    {
                        var theme = themeEl.GetString() ?? "";
                        rawThemes.Add(theme);
                    }
                }

                var themes = rawThemes
                    .Where(t => !string.IsNullOrWhiteSpace(t))
                    .Select(t => t.Length > 40 ? t[..40] : t)
                    .Take(6)
                    .ToList();

                // Pad to at least 3 themes
                while (themes.Count < 3)
                    themes.Add("Explore more");

                categories.Add(new IkigaiThemeCategory(label, themes));
            }

            return new IkigaiExtractionResult(categories);
        }
        catch (JsonException ex)
        {
            return new ExtractionError($"Failed to parse Anthropic response: {ex.Message}");
        }
    }
}
