using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Infrastructure.Settings;

namespace YearPlanningApp.Infrastructure.Services;

public class ReleaseNotesService : IReleaseNotesService
{
    private readonly IHttpClientFactory _http;
    private readonly AnthropicSettings _settings;
    private static readonly string ChangelogPath =
        Path.Combine(AppContext.BaseDirectory, "changelog.json");

    public ReleaseNotesService(IHttpClientFactory http, IOptions<AnthropicSettings> settings)
    {
        _http = http;
        _settings = settings.Value;
    }

    public async Task<string> GenerateHtmlAsync(DateOnly sinceDate, CancellationToken ct = default)
    {
        var commits = LoadCommits(sinceDate);
        if (commits.Count == 0)
            return FallbackHtml(sinceDate, "No commits found for the selected period.");

        var prompt = BuildPrompt(sinceDate, commits);

        try
        {
            var client = _http.CreateClient("anthropic");
            var body = new
            {
                model = "claude-haiku-4-5-20251001",
                max_tokens = 4096,
                messages = new[] { new { role = "user", content = prompt } }
            };
            var req = new HttpRequestMessage(HttpMethod.Post, "/v1/messages");
            req.Headers.Add("x-api-key", _settings.ApiKey);
            req.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

            var res = await client.SendAsync(req, ct);
            if (!res.IsSuccessStatusCode)
                return FallbackHtml(sinceDate, $"AI unavailable ({(int)res.StatusCode}).");

            var json = await res.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("content", out var content) &&
                content.GetArrayLength() > 0 &&
                content[0].TryGetProperty("text", out var text))
            {
                return text.GetString() ?? FallbackHtml(sinceDate, "Empty AI response.");
            }
            return FallbackHtml(sinceDate, "Could not parse AI response.");
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            return FallbackHtml(sinceDate, ex.Message);
        }
    }

    private static List<(string Date, string Subject)> LoadCommits(DateOnly sinceDate)
    {
        if (!File.Exists(ChangelogPath)) return [];
        var json = File.ReadAllText(ChangelogPath);
        using var doc = JsonDocument.Parse(json);
        var result = new List<(string, string)>();
        foreach (var el in doc.RootElement.EnumerateArray())
        {
            var dateStr = el.GetProperty("date").GetString() ?? "";
            var subject = el.GetProperty("subject").GetString() ?? "";
            if (DateOnly.TryParse(dateStr, out var date) && date >= sinceDate)
                result.Add((dateStr, subject));
        }
        return result;
    }

    private static string BuildPrompt(DateOnly sinceDate, List<(string Date, string Subject)> commits)
    {
        var sb = new StringBuilder();
        sb.AppendLine("You are writing a professional HTML release notes email for Flowkigai, a personal productivity app.");
        sb.AppendLine($"Generate a polished HTML email for changes since {sinceDate:MMMM d, yyyy}.");
        sb.AppendLine();
        sb.AppendLine("REQUIREMENTS:");
        sb.AppendLine("- Return ONLY the HTML, no markdown, no explanation, no code fences.");
        sb.AppendLine("- Use inline styles only. Brand color: teal #0D6E6E. Background: #FAFAF8. Text: #1A1A2E.");
        sb.AppendLine("- Max-width 600px, centred, font-family Inter,sans-serif.");
        sb.AppendLine("- Header: dark teal bar with 'Flowkigai' title and 'Release Notes' subtitle.");
        sb.AppendLine($"- Opening sentence: 'Here's what's new since <strong>{sinceDate:MMMM d, yyyy}</strong>.'");
        sb.AppendLine("- Group commits into meaningful feature sections (ignore test/fix/chore commits or summarise as 'Bug fixes & improvements').");
        sb.AppendLine("- Each section has a teal heading, bullet list of user-friendly feature descriptions.");
        sb.AppendLine("- End with a call-to-action button linking to https://flowkigai.com.");
        sb.AppendLine($"- Footer: 'You are receiving this because you registered before {sinceDate:MMMM d, yyyy}.'");
        sb.AppendLine();
        sb.AppendLine("COMMITS:");
        foreach (var (date, subject) in commits)
            sb.AppendLine($"  {date}: {subject}");
        return sb.ToString();
    }

    private static string FallbackHtml(DateOnly sinceDate, string reason) =>
        $"<p>Could not generate release notes automatically ({reason}). " +
        $"Please write the content manually for changes since {sinceDate:MMMM d, yyyy}.</p>";
}
