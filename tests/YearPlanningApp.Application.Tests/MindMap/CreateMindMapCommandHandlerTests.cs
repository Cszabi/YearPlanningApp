using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.MindMap;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.MindMap;

public class CreateMindMapCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly CreateMindMapCommandHandler _handler;

    public CreateMindMapCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new CreateMindMapCommandHandler(_uow, _currentUser);
    }

    [Fact]
    public async Task Handle_ShouldCreateMindMap_WhenNoneExists()
    {
        _uow.MindMaps.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns((Domain.Entities.MindMap?)null, new Domain.Entities.MindMap
            {
                Id = Guid.NewGuid(), UserId = _userId, Year = 2026,
                Nodes = new List<MindMapNode> { new() { Id = Guid.NewGuid(), Label = "Root", NodeType = MindMapNodeType.Root, PositionX = 0, PositionY = 0 } }
            });
        _uow.Ikigai.GetNorthStarAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns(new NorthStar { Statement = "My North Star" });
        _uow.MindMaps.GetSeedSuggestionsFromIkigaiAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns(Array.Empty<string>());

        var result = await _handler.Handle(new CreateMindMapCommand(2026), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Year.ShouldBe(2026);
        await _uow.MindMaps.Received(1).AddAsync(Arg.Any<Domain.Entities.MindMap>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldReturnConflictError_WhenMindMapAlreadyExists()
    {
        var existing = new Domain.Entities.MindMap { Id = Guid.NewGuid(), UserId = _userId, Year = 2026, Nodes = new List<MindMapNode>() };
        _uow.MindMaps.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(existing);

        var result = await _handler.Handle(new CreateMindMapCommand(2026), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
        await _uow.MindMaps.DidNotReceive().AddAsync(Arg.Any<Domain.Entities.MindMap>(), Arg.Any<CancellationToken>());
    }
}
