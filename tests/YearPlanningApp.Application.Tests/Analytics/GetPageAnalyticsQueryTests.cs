using Microsoft.EntityFrameworkCore;
using Shouldly;
using YearPlanningApp.Application.Analytics;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Infrastructure.Persistence;
using YearPlanningApp.Infrastructure.Persistence.Repositories;

namespace YearPlanningApp.Application.Tests.Analytics;

public class GetPageAnalyticsQueryTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly UnitOfWork _uow;
    private readonly GetPageAnalyticsQueryHandler _handler;
    private static readonly DateTimeOffset BaseTime = new DateTimeOffset(2026, 1, 15, 12, 0, 0, TimeSpan.Zero);

    public GetPageAnalyticsQueryTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _uow = new UnitOfWork(_context);
        _handler = new GetPageAnalyticsQueryHandler(_uow);
    }

    private async Task<PageSession> AddSession(
        string page, Guid userId, int? durationSeconds, DateTimeOffset? start = null)
    {
        var s = new PageSession
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Page = page,
            SessionStart = start ?? BaseTime,
            SessionEnd = durationSeconds.HasValue ? BaseTime.AddSeconds(durationSeconds.Value) : null,
            DurationSeconds = durationSeconds,
            ExitType = PageExitType.Navigated
        };
        await _context.PageSessions.AddAsync(s);
        await _context.SaveChangesAsync();
        return s;
    }

    private async Task AddAction(Guid sessionId, Guid userId, string page, string actionType)
    {
        await _context.UserActions.AddAsync(new UserAction
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            PageSessionId = sessionId,
            Page = page,
            ActionType = actionType,
            OccurredAt = DateTimeOffset.UtcNow
        });
        await _context.SaveChangesAsync();
    }

    [Fact]
    public async Task Handle_ShouldComputeCorrectAverageDuration()
    {
        var uid = Guid.NewGuid();
        await AddSession("/goals", uid, 10);
        await AddSession("/goals", uid, 20);
        await AddSession("/goals", uid, 30);

        var result = await _handler.Handle(
            new GetPageAnalyticsQuery("/goals", BaseTime.AddDays(-1), BaseTime.AddDays(1)),
            CancellationToken.None);

        result.AverageDurationSeconds.ShouldBe(20.0);
    }

    [Fact]
    public async Task Handle_ShouldComputeCorrectMedian_OddCount()
    {
        var uid = Guid.NewGuid();
        await AddSession("/goals", uid, 10);
        await AddSession("/goals", uid, 30);
        await AddSession("/goals", uid, 50);

        var result = await _handler.Handle(
            new GetPageAnalyticsQuery("/goals", BaseTime.AddDays(-1), BaseTime.AddDays(1)),
            CancellationToken.None);

        result.MedianDurationSeconds.ShouldBe(30.0);
    }

    [Fact]
    public async Task Handle_ShouldComputeCorrectMedian_EvenCount()
    {
        var uid = Guid.NewGuid();
        await AddSession("/goals", uid, 10);
        await AddSession("/goals", uid, 20);
        await AddSession("/goals", uid, 30);
        await AddSession("/goals", uid, 40);

        var result = await _handler.Handle(
            new GetPageAnalyticsQuery("/goals", BaseTime.AddDays(-1), BaseTime.AddDays(1)),
            CancellationToken.None);

        result.MedianDurationSeconds.ShouldBe(25.0);
    }

    [Fact]
    public async Task Handle_ShouldComputeDropOffRate_OnlySessionsUnder10s()
    {
        var uid = Guid.NewGuid();
        await AddSession("/goals", uid, 5);   // drop-off
        await AddSession("/goals", uid, 8);   // drop-off
        await AddSession("/goals", uid, 30);  // ok
        await AddSession("/goals", uid, 60);  // ok

        var result = await _handler.Handle(
            new GetPageAnalyticsQuery("/goals", BaseTime.AddDays(-1), BaseTime.AddDays(1)),
            CancellationToken.None);

        result.DropOffRate.ShouldBe(50.0);
    }

    [Fact]
    public async Task Handle_ShouldSortTopActionsByCountDescending()
    {
        var uid = Guid.NewGuid();
        var s1 = await AddSession("/goals", uid, 60);
        var s2 = await AddSession("/goals", uid, 120);
        await AddAction(s1.Id, uid, "/goals", "goal_opened");
        await AddAction(s2.Id, uid, "/goals", "goal_opened");
        await AddAction(s1.Id, uid, "/goals", "goal_opened");
        await AddAction(s2.Id, uid, "/goals", "goal_created");

        var result = await _handler.Handle(
            new GetPageAnalyticsQuery("/goals", BaseTime.AddDays(-1), BaseTime.AddDays(1)),
            CancellationToken.None);

        result.TopActions[0].ActionType.ShouldBe("goal_opened");
        result.TopActions[0].Count.ShouldBe(3);
    }

    [Fact]
    public async Task Handle_ShouldAssignEachSessionToExactlyOneBucket()
    {
        var uid = Guid.NewGuid();
        // One session per bucket
        await AddSession("/goals", uid, 5);    // 0–10s
        await AddSession("/goals", uid, 20);   // 10–30s
        await AddSession("/goals", uid, 60);   // 30s–2m
        await AddSession("/goals", uid, 240);  // 2–5m
        await AddSession("/goals", uid, 600);  // 5–15m
        await AddSession("/goals", uid, 1200); // 15m+

        var result = await _handler.Handle(
            new GetPageAnalyticsQuery("/goals", BaseTime.AddDays(-1), BaseTime.AddDays(1)),
            CancellationToken.None);

        var totalInBuckets = result.DurationBuckets.Sum(b => b.Count);
        totalInBuckets.ShouldBe(6);
        result.DurationBuckets.ShouldAllBe(b => b.Count == 1);
    }

    [Fact]
    public async Task Handle_ShouldExcludeSessionsOutsideDateRange()
    {
        var uid = Guid.NewGuid();
        await AddSession("/goals", uid, 60, BaseTime);
        await AddSession("/goals", uid, 60, BaseTime);
        await AddSession("/goals", uid, 60, BaseTime.AddDays(-10)); // outside

        var result = await _handler.Handle(
            new GetPageAnalyticsQuery("/goals", BaseTime.AddDays(-1), BaseTime.AddDays(1)),
            CancellationToken.None);

        result.TotalSessions.ShouldBe(2);
    }

    [Fact]
    public async Task Handle_ShouldCountUniqueUsers_NotTotalSessions()
    {
        var uid1 = Guid.NewGuid();
        var uid2 = Guid.NewGuid();
        await AddSession("/goals", uid1, 60);
        await AddSession("/goals", uid1, 60); // same user, 2nd session
        await AddSession("/goals", uid2, 60);

        var result = await _handler.Handle(
            new GetPageAnalyticsQuery("/goals", BaseTime.AddDays(-1), BaseTime.AddDays(1)),
            CancellationToken.None);

        result.TotalSessions.ShouldBe(3);
        result.UniqueUsers.ShouldBe(2);
    }

    public void Dispose() => _context.Dispose();
}
