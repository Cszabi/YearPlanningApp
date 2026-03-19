using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Ikigai;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Ikigai;

public class SaveNorthStarCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly SaveNorthStarCommandHandler _handler;

    public SaveNorthStarCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new SaveNorthStarCommandHandler(_uow, _currentUser);
    }

    [Fact]
    public async Task Handle_ShouldUpsertNorthStar_AndReturnDto()
    {
        var saved = new NorthStar { Id = Guid.NewGuid(), UserId = _userId, Year = 2026, Statement = "My purpose" };
        _uow.Ikigai.GetNorthStarAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(saved);

        var result = await _handler.Handle(new SaveNorthStarCommand(2026, "My purpose"), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Statement.ShouldBe("My purpose");
        await _uow.Ikigai.Received(1).UpsertNorthStarAsync(Arg.Any<NorthStar>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldSetCorrectUserIdAndYear()
    {
        NorthStar? upserted = null;
        await _uow.Ikigai.UpsertNorthStarAsync(Arg.Do<NorthStar>(n => upserted = n), Arg.Any<CancellationToken>());
        _uow.Ikigai.GetNorthStarAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns(new NorthStar { Id = Guid.NewGuid(), UserId = _userId, Year = 2026, Statement = "S" });

        await _handler.Handle(new SaveNorthStarCommand(2026, "My purpose"), CancellationToken.None);

        upserted.ShouldNotBeNull();
        upserted!.UserId.ShouldBe(_userId);
        upserted.Year.ShouldBe(2026);
        upserted.Statement.ShouldBe("My purpose");
    }
}
