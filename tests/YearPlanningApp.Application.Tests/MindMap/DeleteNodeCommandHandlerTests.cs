using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.MindMap;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.MindMap;

public class DeleteNodeCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly DeleteNodeCommandHandler _handler;

    public DeleteNodeCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new DeleteNodeCommandHandler(_uow, _currentUser);
    }

    private (Domain.Entities.MindMap map, MindMapNode node) BuildMapWithNode()
    {
        var node = new MindMapNode { Id = Guid.NewGuid(), Label = "Node", NodeType = MindMapNodeType.Leaf, PositionX = 0, PositionY = 0 };
        var map = new Domain.Entities.MindMap { Id = Guid.NewGuid(), UserId = _userId, Year = 2026, Nodes = new List<MindMapNode> { node } };
        return (map, node);
    }

    [Fact]
    public async Task Handle_ShouldDeleteNode_WhenNodeExists()
    {
        var (map, node) = BuildMapWithNode();
        _uow.MindMaps.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(map);

        var result = await _handler.Handle(new DeleteNodeCommand(2026, node.Id), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        await _uow.MindMaps.Received(1).RemoveNodeAsync(node, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenMindMapDoesNotExist()
    {
        _uow.MindMaps.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns((Domain.Entities.MindMap?)null);

        var result = await _handler.Handle(new DeleteNodeCommand(2026, Guid.NewGuid()), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenNodeDoesNotExist()
    {
        var map = new Domain.Entities.MindMap { Id = Guid.NewGuid(), UserId = _userId, Year = 2026, Nodes = new List<MindMapNode>() };
        _uow.MindMaps.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(map);

        var result = await _handler.Handle(new DeleteNodeCommand(2026, Guid.NewGuid()), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }
}
