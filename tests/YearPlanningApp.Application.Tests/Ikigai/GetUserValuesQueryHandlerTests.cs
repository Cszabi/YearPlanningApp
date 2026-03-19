using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Ikigai;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Ikigai;

public class GetUserValuesQueryHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly GetUserValuesQueryHandler _handler;

    public GetUserValuesQueryHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new GetUserValuesQueryHandler(_uow, _currentUser);
    }

    [Fact]
    public async Task Handle_ShouldReturnValues_WhenTheyExist()
    {
        var values = new[]
        {
            new UserValue { Id = Guid.NewGuid(), UserId = _userId, Year = 2026, ValueName = "Growth", Rank = 1 },
            new UserValue { Id = Guid.NewGuid(), UserId = _userId, Year = 2026, ValueName = "Family", Rank = 2 },
        };
        _uow.Ikigai.GetValuesByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(values);

        var result = await _handler.Handle(new GetUserValuesQuery(2026), CancellationToken.None);

        result.Count().ShouldBe(2);
        result.First().ValueName.ShouldBe("Growth");
    }

    [Fact]
    public async Task Handle_ShouldReturnEmptyList_WhenNoValuesExist()
    {
        _uow.Ikigai.GetValuesByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns(Array.Empty<UserValue>());

        var result = await _handler.Handle(new GetUserValuesQuery(2026), CancellationToken.None);

        result.ShouldBeEmpty();
    }
}
