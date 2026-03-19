using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Ikigai;
using YearPlanningApp.Application.MindMap;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.MindMap;

public class SeedMindMapFromIkigaiCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly SeedMindMapFromIkigaiCommandHandler _handler;

    public SeedMindMapFromIkigaiCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new SeedMindMapFromIkigaiCommandHandler(_uow, _currentUser);
    }

    private static IkigaiExtractionResult BuildThemes(int categoriesCount = 4, int themesPerCategory = 3)
    {
        var categories = Enumerable.Range(0, categoriesCount)
            .Select(i => new IkigaiThemeCategory(
                $"Category {i}",
                Enumerable.Range(0, themesPerCategory).Select(j => $"theme-{i}-{j}").ToList()))
            .ToList();
        return new IkigaiExtractionResult(categories);
    }

    private Domain.Entities.MindMap BuildMindMap(bool withRootNode = true)
    {
        var map = new Domain.Entities.MindMap { Id = Guid.NewGuid(), UserId = _userId, Year = 2026 };
        var nodes = new List<MindMapNode>();
        if (withRootNode)
        {
            var root = new MindMapNode
            {
                Id = Guid.NewGuid(),
                MindMapId = map.Id,
                ParentNodeId = null,
                NodeType = MindMapNodeType.Root,
                Label = "Old Root Label",
                PositionX = 0,
                PositionY = 0,
            };
            nodes.Add(root);
        }
        map.Nodes = nodes;
        return map;
    }

    private IkigaiJourney BuildJourney(bool withNorthStar = true)
    {
        var journey = new IkigaiJourney { Id = Guid.NewGuid(), UserId = _userId, Year = 2026 };
        if (withNorthStar)
        {
            journey.NorthStar = new NorthStar
            {
                Id = Guid.NewGuid(),
                UserId = _userId,
                Year = 2026,
                Statement = "My North Star Statement",
            };
        }
        return journey;
    }

    [Fact]
    public async Task Handle_ReplaceModeHappyPath_RemovesNonRootNodesAndCreatesBranchesAndLeaves()
    {
        var map = BuildMindMap();
        // Add an existing non-root node
        var rootNode = map.Nodes.First();
        var existingBranch = new MindMapNode
        {
            Id = Guid.NewGuid(), MindMapId = map.Id, ParentNodeId = rootNode.Id,
            NodeType = MindMapNodeType.Branch, Label = "Old Branch", PositionX = 0, PositionY = 0,
        };
        map.Nodes.Add(existingBranch);

        var journey = BuildJourney();
        _uow.MindMaps.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(map);
        _uow.Ikigai.GetJourneyByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(journey);

        var command = new SeedMindMapFromIkigaiCommand(2026, BuildThemes(), MergeMode.Replace);
        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        // Existing non-root node should be soft-deleted
        await _uow.MindMaps.Received(1).RemoveNodeAsync(existingBranch, Arg.Any<CancellationToken>());
        // Should add branch nodes (4 categories)
        await _uow.MindMaps.Received(4).AddNodeAsync(Arg.Is<MindMapNode>(n => n.NodeType == MindMapNodeType.Branch), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_MergeModeHappyPath_KeepsExistingNodesAndAddsBranches()
    {
        var map = BuildMindMap();
        var rootNode2 = map.Nodes.First();
        var existingBranch = new MindMapNode
        {
            Id = Guid.NewGuid(), MindMapId = map.Id, ParentNodeId = rootNode2.Id,
            NodeType = MindMapNodeType.Branch, Label = "Old Branch", PositionX = 0, PositionY = 0,
        };
        map.Nodes.Add(existingBranch);

        var journey = BuildJourney();
        _uow.MindMaps.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(map);
        _uow.Ikigai.GetJourneyByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(journey);

        var command = new SeedMindMapFromIkigaiCommand(2026, BuildThemes(), MergeMode.Merge);
        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        // Existing node should NOT be removed
        await _uow.MindMaps.DidNotReceive().RemoveNodeAsync(existingBranch, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_SetsHasSeededMindMap_ToTrue()
    {
        var map = BuildMindMap();
        var journey = BuildJourney();
        _uow.MindMaps.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(map);
        _uow.Ikigai.GetJourneyByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(journey);

        var command = new SeedMindMapFromIkigaiCommand(2026, BuildThemes(), MergeMode.Merge);
        await _handler.Handle(command, CancellationToken.None);

        journey.HasSeededMindMap.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_UpdatesRootLabelToNorthStarStatement()
    {
        var map = BuildMindMap();
        var journey = BuildJourney(withNorthStar: true);
        _uow.MindMaps.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(map);
        _uow.Ikigai.GetJourneyByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(journey);

        var command = new SeedMindMapFromIkigaiCommand(2026, BuildThemes(), MergeMode.Merge);
        await _handler.Handle(command, CancellationToken.None);

        var rootNode = map.Nodes.First(n => n.ParentNodeId == null);
        rootNode.Label.ShouldBe("My North Star Statement");
        await _uow.MindMaps.Received(1).UpdateNodeAsync(rootNode, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ReturnsNotFoundError_WhenMindMapNotFound()
    {
        _uow.MindMaps.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns((Domain.Entities.MindMap?)null);

        var command = new SeedMindMapFromIkigaiCommand(2026, BuildThemes(), MergeMode.Merge);
        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsT1.ShouldBeTrue();
        result.AsT1.EntityName.ShouldBe("MindMap");
    }

    [Fact]
    public async Task Handle_ReturnsNotFoundError_WhenIkigaiJourneyNotFound()
    {
        var map = BuildMindMap();
        _uow.MindMaps.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(map);
        _uow.Ikigai.GetJourneyByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns((IkigaiJourney?)null);

        var command = new SeedMindMapFromIkigaiCommand(2026, BuildThemes(), MergeMode.Merge);
        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsT1.ShouldBeTrue();
        result.AsT1.EntityName.ShouldBe("IkigaiJourney");
    }

    [Fact]
    public async Task Handle_CreatesBranchNodesAtCorrectCrossPositions()
    {
        var map = BuildMindMap();
        var journey = BuildJourney();
        _uow.MindMaps.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(map);
        _uow.Ikigai.GetJourneyByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(journey);

        var addedNodes = new List<MindMapNode>();
        await _uow.MindMaps.AddNodeAsync(Arg.Do<MindMapNode>(n => addedNodes.Add(n)), Arg.Any<CancellationToken>());

        var command = new SeedMindMapFromIkigaiCommand(2026, BuildThemes(4, 3), MergeMode.Merge);
        await _handler.Handle(command, CancellationToken.None);

        var branches = addedNodes.Where(n => n.NodeType == MindMapNodeType.Branch).ToList();
        branches.Count.ShouldBe(4);

        // Cross positions: (-400,0), (400,0), (0,-400), (0,400)
        branches.ShouldContain(n => n.PositionX == -400 && n.PositionY == 0);
        branches.ShouldContain(n => n.PositionX == 400 && n.PositionY == 0);
        branches.ShouldContain(n => n.PositionX == 0 && n.PositionY == -400);
        branches.ShouldContain(n => n.PositionX == 0 && n.PositionY == 400);
    }

    [Fact]
    public async Task Handle_CreatesLeafNodesStackedCorrectly()
    {
        var map = BuildMindMap();
        var journey = BuildJourney();
        _uow.MindMaps.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(map);
        _uow.Ikigai.GetJourneyByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(journey);

        var addedNodes = new List<MindMapNode>();
        await _uow.MindMaps.AddNodeAsync(Arg.Do<MindMapNode>(n => addedNodes.Add(n)), Arg.Any<CancellationToken>());

        // 4 categories with 3 themes each
        var command = new SeedMindMapFromIkigaiCommand(2026, BuildThemes(4, 3), MergeMode.Merge);
        await _handler.Handle(command, CancellationToken.None);

        var leaves = addedNodes.Where(n => n.NodeType == MindMapNodeType.Leaf).ToList();
        // 4 categories × 3 themes = 12 leaf nodes
        leaves.Count.ShouldBe(12);

        // First branch is at (-400, 0). Leaves should be at (-400, 120), (-400, 240), (-400, 360)
        leaves.ShouldContain(n => n.PositionX == -400 && n.PositionY == 120);
        leaves.ShouldContain(n => n.PositionX == -400 && n.PositionY == 240);
        leaves.ShouldContain(n => n.PositionX == -400 && n.PositionY == 360);
    }
}
