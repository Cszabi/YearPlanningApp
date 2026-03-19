using System.Net;
using System.Text;
using Microsoft.Extensions.Options;
using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Ikigai;
using YearPlanningApp.Infrastructure.Services;
using YearPlanningApp.Infrastructure.Settings;

namespace YearPlanningApp.Application.Tests.Ikigai;

/// <summary>
/// Fake HttpMessageHandler for injecting controlled HTTP responses.
/// </summary>
internal class FakeHttpMessageHandler(HttpStatusCode statusCode, string responseBody) : HttpMessageHandler
{
    public HttpStatusCode StatusCode { get; } = statusCode;
    public string ResponseBody { get; } = responseBody;

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        var response = new HttpResponseMessage(StatusCode)
        {
            Content = new StringContent(ResponseBody, Encoding.UTF8, "application/json"),
        };
        return Task.FromResult(response);
    }
}

public class IkigaiThemeExtractionServiceTests
{
    private static IkigaiThemeExtractionService BuildService(HttpStatusCode code, string body)
    {
        var handler = new FakeHttpMessageHandler(code, body);
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://api.anthropic.com") };

        var factory = Substitute.For<IHttpClientFactory>();
        factory.CreateClient("anthropic").Returns(httpClient);

        var settings = Options.Create(new AnthropicSettings { ApiKey = "test-key" });
        return new IkigaiThemeExtractionService(factory, settings);
    }

    private static IkigaiJourneyDto BuildJourney()
    {
        return new IkigaiJourneyDto(
            Guid.NewGuid(), 2026, "Complete", DateTime.UtcNow, false,
            new List<IkigaiRoomDto>
            {
                new(Guid.NewGuid(), "Love", new List<string> { "coding", "teaching" }, true),
                new(Guid.NewGuid(), "GoodAt", new List<string> { "problem solving" }, true),
                new(Guid.NewGuid(), "WorldNeeds", new List<string> { "education" }, true),
                new(Guid.NewGuid(), "PaidFor", new List<string> { "software development" }, true),
            },
            null,
            new List<UserValueDto>());
    }

    private static string ValidAnthropicResponse(List<(string Label, List<string> Themes)> cats)
    {
        var catJson = string.Join(",", cats.Select(c =>
            $"{{\"label\":\"{c.Label}\",\"themes\":[{string.Join(",", c.Themes.Select(t => $"\"{t}\""))}]}}"));
        var innerJson = $"{{\"categories\":[{catJson}]}}".Replace("\"", "\\\"");
        return $"{{\"content\":[{{\"type\":\"text\",\"text\":\"{innerJson}\"}}]}}";
    }

    [Fact]
    public async Task ExtractThemes_ShouldReturnExtractionResult_OnSuccess()
    {
        var cats = new List<(string, List<string>)>
        {
            ("What I Love", new List<string> { "coding", "teaching", "music" }),
            ("What The World Needs", new List<string> { "education", "health", "tools" }),
            ("What I Can Be Paid For", new List<string> { "software", "consulting", "writing" }),
            ("What I'm Good At", new List<string> { "problem solving", "analysis", "communication" }),
        };
        var svc = BuildService(HttpStatusCode.OK, ValidAnthropicResponse(cats));

        var result = await svc.ExtractThemesAsync(BuildJourney());

        result.IsT0.ShouldBeTrue();
        result.AsT0.Categories.Count.ShouldBe(4);
        result.AsT0.Categories[0].Label.ShouldBe("What I Love");
        result.AsT0.Categories[0].Themes.ShouldContain("coding");
    }

    [Fact]
    public async Task ExtractThemes_ShouldTruncateThemesLongerThan40Chars()
    {
        var longTheme = "This theme name is way too long for the UI component here";
        var cats = new List<(string, List<string>)>
        {
            ("What I Love", new List<string> { longTheme, "short", "another" }),
            ("What The World Needs", new List<string> { "education", "health", "tools" }),
            ("What I Can Be Paid For", new List<string> { "software", "consulting", "writing" }),
            ("What I'm Good At", new List<string> { "problem solving", "analysis", "communication" }),
        };
        var svc = BuildService(HttpStatusCode.OK, ValidAnthropicResponse(cats));

        var result = await svc.ExtractThemesAsync(BuildJourney());

        result.IsT0.ShouldBeTrue();
        var truncated = result.AsT0.Categories[0].Themes[0];
        truncated.Length.ShouldBeLessThanOrEqualTo(40);
        truncated.ShouldBe(longTheme[..40]);
    }

    [Fact]
    public async Task ExtractThemes_ShouldPadCategoriesToAtLeast3Themes()
    {
        var cats = new List<(string, List<string>)>
        {
            ("What I Love", new List<string> { "coding" }), // only 1 theme
            ("What The World Needs", new List<string> { "education", "health", "tools" }),
            ("What I Can Be Paid For", new List<string> { "software", "consulting", "writing" }),
            ("What I'm Good At", new List<string> { "problem solving", "analysis", "communication" }),
        };
        var svc = BuildService(HttpStatusCode.OK, ValidAnthropicResponse(cats));

        var result = await svc.ExtractThemesAsync(BuildJourney());

        result.IsT0.ShouldBeTrue();
        result.AsT0.Categories[0].Themes.Count.ShouldBeGreaterThanOrEqualTo(3);
        result.AsT0.Categories[0].Themes.ShouldContain("Explore more");
    }

    [Fact]
    public async Task ExtractThemes_ShouldCapAt6ThemesPerCategory()
    {
        var manyThemes = Enumerable.Range(1, 10).Select(i => $"theme{i}").ToList();
        var cats = new List<(string, List<string>)>
        {
            ("What I Love", manyThemes),
            ("What The World Needs", new List<string> { "education", "health", "tools" }),
            ("What I Can Be Paid For", new List<string> { "software", "consulting", "writing" }),
            ("What I'm Good At", new List<string> { "problem solving", "analysis", "communication" }),
        };
        var svc = BuildService(HttpStatusCode.OK, ValidAnthropicResponse(cats));

        var result = await svc.ExtractThemesAsync(BuildJourney());

        result.IsT0.ShouldBeTrue();
        result.AsT0.Categories[0].Themes.Count.ShouldBeLessThanOrEqualTo(6);
    }

    [Fact]
    public async Task ExtractThemes_ShouldReturnExtractionError_OnHttpFailure()
    {
        var svc = BuildService(HttpStatusCode.ServiceUnavailable, "error");

        var result = await svc.ExtractThemesAsync(BuildJourney());

        result.IsT1.ShouldBeTrue();
        result.AsT1.Message.ShouldContain("503");
    }

    [Fact]
    public async Task ExtractThemes_ShouldReturnExtractionError_OnInvalidJson()
    {
        var invalidBody = "{\"content\":[{\"type\":\"text\",\"text\":\"this is not json at all\"}]}";
        var svc = BuildService(HttpStatusCode.OK, invalidBody);

        var result = await svc.ExtractThemesAsync(BuildJourney());

        result.IsT1.ShouldBeTrue();
    }
}
