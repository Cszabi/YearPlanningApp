using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Ikigai;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Ikigai;

public class GetNorthStarQueryHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly GetNorthStarQueryHandler _handler;

    public GetNorthStarQueryHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new GetNorthStarQueryHandler(_uow, _currentUser);
    }

    [Fact]
    public async Task Handle_ShouldReturnNorthStar_WhenItExists()
    {
        var northStar = new NorthStar { Id = Guid.NewGuid(), UserId = _userId, Year = 2026, Statement = "My purpose" };
        _uow.Ikigai.GetNorthStarAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(northStar);

        var result = await _handler.Handle(new GetNorthStarQuery(2026), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Statement.ShouldBe("My purpose");
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenNorthStarDoesNotExist()
    {
        _uow.Ikigai.GetNorthStarAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns((NorthStar?)null);

        var result = await _handler.Handle(new GetNorthStarQuery(2026), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }
}
