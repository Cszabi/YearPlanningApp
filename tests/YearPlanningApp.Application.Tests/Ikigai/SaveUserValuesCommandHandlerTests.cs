using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Ikigai;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Ikigai;

public class SaveUserValuesCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly SaveUserValuesCommandHandler _handler;

    public SaveUserValuesCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new SaveUserValuesCommandHandler(_uow, _currentUser);
    }

    private List<SaveValueItem> ValidValues() =>
    [
        new("Growth", 1), new("Family", 2), new("Health", 3), new("Freedom", 4), new("Creativity", 5)
    ];

    [Fact]
    public async Task Handle_ShouldSaveValues_WhenRanksAreUnique1To5()
    {
        var result = await _handler.Handle(
            new SaveUserValuesCommand(2026, ValidValues()), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Count.ShouldBe(5);
        await _uow.Ikigai.Received(1).UpsertUserValuesAsync(
            _userId, 2026, Arg.Any<IEnumerable<UserValue>>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldReturnValidationError_WhenRanksAreDuplicated()
    {
        var values = new List<SaveValueItem>
        {
            new("Growth", 1), new("Family", 1), new("Health", 3), new("Freedom", 4), new("Creativity", 5)
        };

        var result = await _handler.Handle(
            new SaveUserValuesCommand(2026, values), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnValidationError_WhenRanksNotFrom1To5()
    {
        var values = new List<SaveValueItem>
        {
            new("Growth", 1), new("Family", 2), new("Health", 3), new("Freedom", 4), new("Creativity", 6)
        };

        var result = await _handler.Handle(
            new SaveUserValuesCommand(2026, values), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }
}
