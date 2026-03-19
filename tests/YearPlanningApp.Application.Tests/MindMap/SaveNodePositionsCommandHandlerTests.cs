using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.MindMap;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.MindMap;

public class SaveNodePositionsCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly SaveNodePositionsCommandHandler _handler;

    public SaveNodePositionsCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new SaveNodePositionsCommandHandler(_uow, _currentUser);
    }

    [Fact]
    public async Task Handle_ShouldUpdatePositions_ForKnownNodes()
    {
        var node = new MindMapNode { Id = Guid.NewGuid(), Label = "Node", NodeType = MindMapNodeType.Leaf, PositionX = 0, PositionY = 0 };
        var map = new Domain.Entities.MindMap { Id = Guid.NewGuid(), UserId = _userId, Year = 2026, Nodes = new List<MindMapNode> { node } };
        _uow.MindMaps.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(map);

        var result = await _handler.Handle(
            new SaveNodePositionsCommand(2026, new List<NodePositionUpdate> { new(node.Id, 150, 250) }),
            CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        node.PositionX.ShouldBe(150);
        node.PositionY.ShouldBe(250);
        await _uow.MindMaps.Received(1).UpdateNodeAsync(node, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldSkipUnknownNodes_WithoutError()
    {
        var map = new Domain.Entities.MindMap { Id = Guid.NewGuid(), UserId = _userId, Year = 2026, Nodes = new List<MindMapNode>() };
        _uow.MindMaps.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(map);

        var result = await _handler.Handle(
            new SaveNodePositionsCommand(2026, new List<NodePositionUpdate> { new(Guid.NewGuid(), 100, 200) }),
            CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        await _uow.MindMaps.DidNotReceive().UpdateNodeAsync(Arg.Any<MindMapNode>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenMindMapDoesNotExist()
    {
        _uow.MindMaps.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns((Domain.Entities.MindMap?)null);

        var result = await _handler.Handle(
            new SaveNodePositionsCommand(2026, new List<NodePositionUpdate>()),
            CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }
}
