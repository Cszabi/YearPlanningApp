using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using NSubstitute;
using Shouldly;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using YearPlanningApp.Infrastructure.Services;
using YearPlanningApp.Infrastructure.Settings;

namespace YearPlanningApp.Application.Tests.Music;

public class JamendoMusicServiceTests
{
    // ── Helpers ───────────────────────────────────────────────────────────────

    private static IHttpClientFactory MakeFakeFactory(HttpResponseMessage response)
    {
        var handler = new FakeHttpMessageHandler(response);
        var client = new HttpClient(handler) { BaseAddress = new Uri("https://api.jamendo.com") };
        var factory = Substitute.For<IHttpClientFactory>();
        factory.CreateClient(Arg.Any<string>()).Returns(client);
        return factory;
    }

    private class FakeHttpMessageHandler(HttpResponseMessage response) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
            => Task.FromResult(response);
    }

    private static IMemoryCache MakeFreshCache() =>
        new MemoryCache(new MemoryCacheOptions());

    private static IOptions<JamendoSettings> DefaultSettings() =>
        Options.Create(new JamendoSettings { ClientId = "test" });

    private const string ValidJson = """
        {
          "results": [
            { "id": "t1", "name": "Deep Focus", "artist_name": "Artist A", "audio": "https://cdn.jamendo.com/t1.mp3", "duration": 300 },
            { "id": "t2", "name": "Short Track", "artist_name": "Artist B", "audio": "https://cdn.jamendo.com/t2.mp3", "duration": 30  },
            { "id": "t3", "name": "No Audio",    "artist_name": "Artist C", "audio": "",                                "duration": 200 }
          ]
        }
        """;

    private static HttpResponseMessage OkResponse(string json) =>
        new(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

    // ── Tests ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetTracksAsync_ReturnsEmptyList_WhenHttpCallFails()
    {
        var factory = MakeFakeFactory(new HttpResponseMessage(HttpStatusCode.InternalServerError));
        var service = new JamendoMusicService(factory, DefaultSettings(), MakeFreshCache());

        var result = await service.GetTracksAsync();

        result.ShouldBeEmpty();
    }

    [Fact]
    public async Task GetTracksAsync_FiltersOut_ShortTracks()
    {
        var factory = MakeFakeFactory(OkResponse(ValidJson));
        var service = new JamendoMusicService(factory, DefaultSettings(), MakeFreshCache());

        var result = await service.GetTracksAsync();

        result.ShouldNotContain(t => t.Name == "Short Track");
    }

    [Fact]
    public async Task GetTracksAsync_FiltersOut_TracksWithEmptyAudioUrl()
    {
        var factory = MakeFakeFactory(OkResponse(ValidJson));
        var service = new JamendoMusicService(factory, DefaultSettings(), MakeFreshCache());

        var result = await service.GetTracksAsync();

        result.ShouldNotContain(t => t.Name == "No Audio");
    }

    [Fact]
    public async Task GetTracksAsync_ReturnsOnlyDeepFocus_FromValidJson()
    {
        var factory = MakeFakeFactory(OkResponse(ValidJson));
        var service = new JamendoMusicService(factory, DefaultSettings(), MakeFreshCache());

        var result = await service.GetTracksAsync();

        result.Count.ShouldBe(1);
        result[0].Name.ShouldBe("Deep Focus");
    }

    [Fact]
    public async Task GetTracksAsync_ReturnsFromCache_OnSecondCall()
    {
        var factory = MakeFakeFactory(OkResponse(ValidJson));
        var service = new JamendoMusicService(factory, DefaultSettings(), MakeFreshCache());

        await service.GetTracksAsync();
        await service.GetTracksAsync();

        factory.Received(1).CreateClient(Arg.Any<string>());
    }
}
