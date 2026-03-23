using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using NSubstitute;
using Shouldly;
using System.Net;
using System.Text;
using YearPlanningApp.Infrastructure.Services;
using YearPlanningApp.Infrastructure.Settings;

namespace YearPlanningApp.Application.Tests.Music;

public class OpenverseMusicServiceTests
{
    // ── Helpers ───────────────────────────────────────────────────────────────

    /// <summary>Returns the same response for every request.</summary>
    private static IHttpClientFactory MakeFakeFactory(HttpResponseMessage response)
    {
        var handler = new ReusableFakeHandler(response);
        var client = new HttpClient(handler);
        var factory = Substitute.For<IHttpClientFactory>();
        factory.CreateClient(Arg.Any<string>()).Returns(client);
        return factory;
    }

    /// <summary>Handler that can be reused across multiple SendAsync calls.</summary>
    private class ReusableFakeHandler(HttpResponseMessage response) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            // Clone content so it can be read multiple times
            var clone = new HttpResponseMessage(response.StatusCode)
            {
                Content = new StringContent(
                    response.Content.ReadAsStringAsync().GetAwaiter().GetResult(),
                    Encoding.UTF8,
                    "application/json")
            };
            return Task.FromResult(clone);
        }
    }

    private static IMemoryCache MakeFreshCache() =>
        new MemoryCache(new MemoryCacheOptions());

    private static HttpResponseMessage OkResponse(string json) =>
        new(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

    // One track that passes all filters (duration 300_000 ms = 300 s, valid url)
    private const string SingleTrackJson = """
        {
          "results": [
            { "id": "t1", "title": "Deep Focus", "creator": "Artist A", "url": "https://cdn.openverse.org/t1.mp3", "duration": 300000 }
          ]
        }
        """;

    // Track shorter than 60 s in ms = 59 000 ms — should be filtered
    private const string ShortTrackJson = """
        {
          "results": [
            { "id": "t2", "title": "Too Short", "creator": "Artist B", "url": "https://cdn.openverse.org/t2.mp3", "duration": 59000 }
          ]
        }
        """;

    // Track with empty URL — should be filtered
    private const string NoUrlTrackJson = """
        {
          "results": [
            { "id": "t3", "title": "No Url", "creator": "Artist C", "url": "", "duration": 300000 }
          ]
        }
        """;

    // Two entries with the same id — second should be deduped
    private const string DuplicateIdJson = """
        {
          "results": [
            { "id": "dup", "title": "Track A", "creator": "Artist", "url": "https://cdn.openverse.org/dup.mp3", "duration": 300000 },
            { "id": "dup", "title": "Track A copy", "creator": "Artist", "url": "https://cdn.openverse.org/dup2.mp3", "duration": 300000 }
          ]
        }
        """;

    // ── Tests ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetTracksAsync_ReturnsEmptyList_WhenAllHttpCallsFail()
    {
        var factory = MakeFakeFactory(new HttpResponseMessage(HttpStatusCode.InternalServerError));
        var service = new OpenverseMusicService(factory, MakeFreshCache(), Options.Create(new OpenverseSettings()));

        var result = await service.GetTracksAsync();

        result.ShouldBeEmpty();
    }

    [Fact]
    public async Task GetTracksAsync_FiltersOut_TracksWithDurationUnder60Seconds()
    {
        var factory = MakeFakeFactory(OkResponse(ShortTrackJson));
        var service = new OpenverseMusicService(factory, MakeFreshCache(), Options.Create(new OpenverseSettings()));

        var result = await service.GetTracksAsync();

        result.ShouldNotContain(t => t.Name == "Too Short");
    }

    [Fact]
    public async Task GetTracksAsync_FiltersOut_TracksWithEmptyAudioUrl()
    {
        var factory = MakeFakeFactory(OkResponse(NoUrlTrackJson));
        var service = new OpenverseMusicService(factory, MakeFreshCache(), Options.Create(new OpenverseSettings()));

        var result = await service.GetTracksAsync();

        result.ShouldBeEmpty();
    }

    [Fact]
    public async Task GetTracksAsync_DeduplicatesTracks_BySameId()
    {
        var factory = MakeFakeFactory(OkResponse(DuplicateIdJson));
        var service = new OpenverseMusicService(factory, MakeFreshCache(), Options.Create(new OpenverseSettings()));

        var result = await service.GetTracksAsync();

        // Even though the handler returns the same body for all 4 queries,
        // deduplication means only 1 unique id survives across all responses.
        result.ShouldAllBe(t => t.Id == "dup");
        result.Count.ShouldBe(1);
    }

    [Fact]
    public async Task GetTracksAsync_MapsDurationCorrectly_FromMilliseconds()
    {
        var factory = MakeFakeFactory(OkResponse(SingleTrackJson));
        var service = new OpenverseMusicService(factory, MakeFreshCache(), Options.Create(new OpenverseSettings()));

        var result = await service.GetTracksAsync();

        // API returns ms; service stores seconds (300_000 ms → 300 s)
        result.First(t => t.Id == "t1").DurationSeconds.ShouldBe(300);
    }

    [Fact]
    public async Task GetTracksAsync_ReturnsCachedResult_OnSecondCall()
    {
        var factory = MakeFakeFactory(OkResponse(SingleTrackJson));
        var service = new OpenverseMusicService(factory, MakeFreshCache(), Options.Create(new OpenverseSettings()));

        await service.GetTracksAsync();
        await service.GetTracksAsync();

        // First call creates 1 client (reused across all 4 queries); second call hits cache — total stays 1
        factory.Received(1).CreateClient(Arg.Any<string>());
    }
}
