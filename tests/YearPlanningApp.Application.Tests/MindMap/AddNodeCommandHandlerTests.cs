using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.MindMap;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.MindMap;

public class AddNodeCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly AddNodeCommandHandler _handler;

    public AddNodeCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new AddNodeCommandHandler(_uow, _currentUser);
    }

    private Domain.Entities.MindMap BuildMap(IEnumerable<MindMapNode>? nodes = null)
    {
        var map = new Domain.Entities.MindMap { Id = Guid.NewGuid(), UserId = _userId, Year = 2026 };
        map.Nodes = nodes?.ToList() ?? new List<MindMapNode>();
        return map;
    }

    [Fact]
    public async Task Handle_ShouldAddNode_WhenMindMapExists()
    {
        var map = BuildMap();
        _uow.MindMaps.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(map);
        MindMapNode? added = null;
        await _uow.MindMaps.AddNodeAsync(Arg.Do<MindMapNode>(n => added = n), Arg.Any<CancellationToken>());

        var result = await _handler.Handle(
            new AddNodeCommand(2026, null, MindMapNodeType.Leaf, "New Idea", 100, 200),
            CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Label.ShouldBe("New Idea");
        added.ShouldNotBeNull();
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenMindMapDoesNotExist()
    {
        _uow.MindMaps.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns((Domain.Entities.MindMap?)null);

        var result = await _handler.Handle(
            new AddNodeCommand(2026, null, MindMapNodeType.Leaf, "Idea", 0, 0),
            CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenParentNodeDoesNotBelongToMap()
    {
        var map = BuildMap(); // empty nodes
        _uow.MindMaps.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(map);

        var result = await _handler.Handle(
            new AddNodeCommand(2026, Guid.NewGuid() /* non-existent parent */, MindMapNodeType.Leaf, "Idea", 0, 0),
            CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldAddNode_WhenParentNodeExists()
    {
        var parentNode = new MindMapNode { Id = Guid.NewGuid(), Label = "Parent", NodeType = MindMapNodeType.Branch, PositionX = 0, PositionY = 0 };
        var map = BuildMap(new[] { parentNode });
        _uow.MindMaps.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(map);

        var result = await _handler.Handle(
            new AddNodeCommand(2026, parentNode.Id, MindMapNodeType.Leaf, "Child Idea", 50, 100),
            CancellationToken.None);

        result.IsT0.ShouldBeTrue();
    }
}
