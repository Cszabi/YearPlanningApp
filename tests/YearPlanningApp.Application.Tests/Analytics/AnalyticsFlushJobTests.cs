using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;
using YearPlanningApp.Infrastructure.Jobs;

namespace YearPlanningApp.Application.Tests.Analytics;

public class AnalyticsFlushJobTests
{
    private readonly IAnalyticsBuffer _buffer;
    private readonly IUnitOfWork _uow;
    private readonly IUserActionRepository _actionRepo;
    private readonly AnalyticsFlushJob _job;

    public AnalyticsFlushJobTests()
    {
        _buffer = Substitute.For<IAnalyticsBuffer>();
        _uow = Substitute.For<IUnitOfWork>();
        _actionRepo = Substitute.For<IUserActionRepository>();
        _uow.UserActions.Returns(_actionRepo);

        _job = new AnalyticsFlushJob(
            _buffer, _uow,
            Substitute.For<Microsoft.Extensions.Logging.ILogger<AnalyticsFlushJob>>());
    }

    [Fact]
    public async Task ExecuteAsync_ShouldMoveActionsFromBufferToDatabase()
    {
        var actions = Enumerable.Range(0, 3)
            .Select(_ => new UserAction { Id = Guid.NewGuid(), ActionType = "test" })
            .ToList()
            .AsReadOnly() as IReadOnlyList<UserAction>;
        _buffer.IsAvailable.Returns(true);
        _buffer.DequeueAllAsync(Arg.Any<CancellationToken>()).Returns(actions!);

        await _job.ExecuteAsync(CancellationToken.None);

        await _actionRepo.Received(1).AddBatchAsync(
            Arg.Is<IEnumerable<UserAction>>(a => a.Count() == 3),
            Arg.Any<CancellationToken>());
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ExecuteAsync_ShouldSkip_WhenBufferIsEmpty()
    {
        _buffer.IsAvailable.Returns(true);
        _buffer.DequeueAllAsync(Arg.Any<CancellationToken>())
            .Returns(Array.Empty<UserAction>() as IReadOnlyList<UserAction>);

        await _job.ExecuteAsync(CancellationToken.None);

        await _actionRepo.DidNotReceive().AddBatchAsync(
            Arg.Any<IEnumerable<UserAction>>(), Arg.Any<CancellationToken>());
        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ExecuteAsync_ShouldSkip_WhenRedisIsUnavailable()
    {
        _buffer.IsAvailable.Returns(false);

        await _job.ExecuteAsync(CancellationToken.None);

        await _buffer.DidNotReceive().DequeueAllAsync(Arg.Any<CancellationToken>());
        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
