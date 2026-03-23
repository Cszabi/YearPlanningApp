using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using OneOf;
using YearPlanningApp.Application.Onboarding;
using YearPlanningApp.Infrastructure.Settings;

namespace YearPlanningApp.Infrastructure.Services;

public class OnboardingMindMapSeedService : IOnboardingMindMapSeedService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly AnthropicSettings _settings;

    private const string SystemPrompt =
        "You are a mind map builder for a personal year-planning app. " +
        "Based on the user's conversation answers, generate 6–12 meaningful mind map nodes (branches + leaves, never Goal nodes). " +
        "Rules: " +
        "• Root node is never included in proposedNodes. " +
        "• 3–6 branches, each with 1–3 leaves. " +
        "• Branches represent life areas or major themes; leaves are specific focuses within that area. " +
        "• Assign ikigaiCategory only when clearly applicable: Love, GoodAt, WorldNeeds, PaidFor, or Intersection. " +
        "• Optional single-emoji icon per node where it adds clarity. " +
        "• Output: valid JSON only — no preamble, no markdown fences. " +
        "Format: {\"proposedNodes\":[{\"label\":\"...\",\"nodeType\":\"Branch\",\"parentLabel\":null,\"ikigaiCategory\":null,\"icon\":\"🎯\",\"notes\":null}," +
        "{\"label\":\"...\",\"nodeType\":\"Leaf\",\"parentLabel\":\"...\",\"ikigaiCategory\":null,\"icon\":null,\"notes\":null}]," +
        "\"seedSummary\":\"One sentence describing what was built.\"}";

    public OnboardingMindMapSeedService(
        IHttpClientFactory httpClientFactory,
        IOptions<AnthropicSettings> settings)
    {
        _httpClientFactory = httpClientFactory;
        _settings = settings.Value;
    }

    public async Task<OneOf<SeedMindMapForOnboardingResult, OnboardingSeedError>> GenerateNodesAsync(
        string path,
        List<ConversationAnswerDto> answers,
        List<string> existingNodeLabels,
        CancellationToken ct = default)
    {
        try
        {
            var userContent = BuildUserPrompt(path, answers, existingNodeLabels);
            var requestBody = new
            {
                model = "claude-haiku-4-5-20251001",
                max_tokens = 2048,
                system = SystemPrompt,
                messages = new[] { new { role = "user", content = userContent } }
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
                return new OnboardingSeedError($"Anthropic API returned {(int)response.StatusCode}");

            var responseJson = await response.Content.ReadAsStringAsync(ct);
            return ParseAndValidate(responseJson);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            return new OnboardingSeedError($"Mind map seed failed: {ex.Message}");
        }
    }

    private static string BuildUserPrompt(string path, List<ConversationAnswerDto> answers, List<string> existingLabels)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Path: {path}");
        if (existingLabels.Count > 0)
        {
            sb.AppendLine($"Existing mind map nodes (avoid duplicates): {string.Join(", ", existingLabels)}");
        }
        sb.AppendLine("\nUser's answers:");
        foreach (var a in answers)
        {
            sb.AppendLine($"Q: {a.Question}");
            sb.AppendLine($"A: {a.Answer}");
        }
        return sb.ToString();
    }

    private static OneOf<SeedMindMapForOnboardingResult, OnboardingSeedError> ParseAndValidate(string responseJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(responseJson);

            string? extractedJson = null;
            if (doc.RootElement.TryGetProperty("content", out var contentArr) &&
                contentArr.GetArrayLength() > 0 &&
                contentArr[0].TryGetProperty("text", out var textEl))
            {
                extractedJson = textEl.GetString();
            }

            if (string.IsNullOrWhiteSpace(extractedJson))
                return new OnboardingSeedError("Empty response from AI service");

            using var resultDoc = JsonDocument.Parse(extractedJson);

            if (!resultDoc.RootElement.TryGetProperty("proposedNodes", out var nodesEl))
                return new OnboardingSeedError("Invalid JSON: missing 'proposedNodes'");

            var nodes = new List<ProposedNodeDto>();
            foreach (var nodeEl in nodesEl.EnumerateArray())
            {
                var label = nodeEl.TryGetProperty("label", out var lEl) ? lEl.GetString() ?? "" : "";
                var nodeType = nodeEl.TryGetProperty("nodeType", out var ntEl) ? ntEl.GetString() ?? "Leaf" : "Leaf";
                var parentLabel = nodeEl.TryGetProperty("parentLabel", out var plEl) ? plEl.GetString() : null;
                var ikigaiCategory = nodeEl.TryGetProperty("ikigaiCategory", out var ikEl) ? ikEl.GetString() : null;
                var icon = nodeEl.TryGetProperty("icon", out var iEl) ? iEl.GetString() : null;
                var notes = nodeEl.TryGetProperty("notes", out var nEl) ? nEl.GetString() : null;

                if (!string.IsNullOrWhiteSpace(label))
                    nodes.Add(new ProposedNodeDto(label, nodeType, parentLabel, ikigaiCategory, icon, notes));
            }

            var seedSummary = resultDoc.RootElement.TryGetProperty("seedSummary", out var ssEl)
                ? ssEl.GetString() ?? ""
                : "";

            return new SeedMindMapForOnboardingResult(nodes, seedSummary);
        }
        catch (JsonException ex)
        {
            return new OnboardingSeedError($"Failed to parse AI response: {ex.Message}");
        }
    }
}
