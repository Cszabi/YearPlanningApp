using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Onboarding;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Onboarding;

public class BatchCreateMindMapNodesCommandHandlerTests
{
    private readonly IUnitOfWork _uow;
    private readonly IMindMapRepository _mindMapRepo;
    private readonly ICurrentUserService _currentUser;
    private readonly BatchCreateMindMapNodesCommandHandler _handler;
    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _mapId = Guid.NewGuid();
    private readonly Guid _rootNodeId = Guid.NewGuid();

    public BatchCreateMindMapNodesCommandHandlerTests()
    {
        _uow = Substitute.For<IUnitOfWork>();
        _mindMapRepo = Substitute.For<IMindMapRepository>();
        _uow.MindMaps.Returns(_mindMapRepo);

        _currentUser = Substitute.For<ICurrentUserService>();
        _currentUser.UserId.Returns(_userId);

        _handler = new BatchCreateMindMapNodesCommandHandler(_uow, _currentUser);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Domain.Entities.MindMap CreateMap(bool withRoot = true)
    {
        var map = new Domain.Entities.MindMap { Id = _mapId, UserId = _userId, Year = 2026 };
        if (withRoot)
        {
            map.Nodes.Add(new MindMapNode
            {
                Id = _rootNodeId,
                MindMapId = _mapId,
                NodeType = MindMapNodeType.Root,
                Label = "Me",
                ParentNodeId = null,
            });
        }
        return map;
    }

    private List<MindMapNode> CaptureAddNodeCalls()
    {
        var captured = new List<MindMapNode>();
        _mindMapRepo
            .When(r => r.AddNodeAsync(Arg.Any<MindMapNode>(), Arg.Any<CancellationToken>()))
            .Do(call => captured.Add(call.Arg<MindMapNode>()));
        return captured;
    }

    // ── Error cases ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenMapDoesNotExist()
    {
        _mindMapRepo
            .GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns((Domain.Entities.MindMap?)null);

        var result = await _handler.Handle(
            new BatchCreateMindMapNodesCommand(2026, [new("Career", "Branch", null, null, null, null)]),
            CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenRootNodeMissing()
    {
        var mapWithoutRoot = new Domain.Entities.MindMap { Id = _mapId, UserId = _userId, Year = 2026 };
        _mindMapRepo
            .GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns(mapWithoutRoot);

        var result = await _handler.Handle(
            new BatchCreateMindMapNodesCommand(2026, [new("Career", "Branch", null, null, null, null)]),
            CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    // ── Branch creation ───────────────────────────────────────────────────────

    [Fact]
    public async Task Handle_ShouldCreateBranchNode_WithFirstPosition()
    {
        var map = CreateMap();
        _mindMapRepo.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(map);
        var captured = CaptureAddNodeCalls();

        await _handler.Handle(
            new BatchCreateMindMapNodesCommand(2026, [new("Career", "Branch", null, null, "💼", "notes")]),
            CancellationToken.None);

        var branch = captured.SingleOrDefault(n => n.Label == "Career");
        branch.ShouldNotBeNull();
        branch!.NodeType.ShouldBe(MindMapNodeType.Branch);
        branch.ParentNodeId.ShouldBe(_rootNodeId);
        branch.PositionX.ShouldBe(-400);
        branch.PositionY.ShouldBe(0);
        branch.Icon.ShouldBe("💼");
        branch.Notes.ShouldBe("notes");
    }

    [Fact]
    public async Task Handle_ShouldAssignSequentialPositions_ForMultipleBranches()
    {
        var map = CreateMap();
        _mindMapRepo.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(map);
        var captured = CaptureAddNodeCalls();

        var inputs = new List<BatchNodeInput>
        {
            new("B1", "Branch", null, null, null, null),
            new("B2", "Branch", null, null, null, null),
            new("B3", "Branch", null, null, null, null),
        };

        await _handler.Handle(new BatchCreateMindMapNodesCommand(2026, inputs), CancellationToken.None);

        var branches = captured.Where(n => n.NodeType == MindMapNodeType.Branch).ToList();
        branches.Count.ShouldBe(3);
        // Verify the first three positions from BranchPositions array
        branches[0].PositionX.ShouldBe(-400); branches[0].PositionY.ShouldBe(0);
        branches[1].PositionX.ShouldBe(400);  branches[1].PositionY.ShouldBe(0);
        branches[2].PositionX.ShouldBe(0);    branches[2].PositionY.ShouldBe(-350);
    }

    [Fact]
    public async Task Handle_ShouldParseIkigaiCategory_WhenProvided()
    {
        var map = CreateMap();
        _mindMapRepo.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(map);
        var captured = CaptureAddNodeCalls();

        await _handler.Handle(
            new BatchCreateMindMapNodesCommand(2026, [new("Creative Work", "Branch", null, "Love", null, null)]),
            CancellationToken.None);

        var branch = captured.SingleOrDefault(n => n.Label == "Creative Work");
        branch.ShouldNotBeNull();
        branch!.IkigaiCategory.ShouldBe(IkigaiCategory.Love);
    }

    [Fact]
    public async Task Handle_ShouldSetNullIkigaiCategory_WhenValueIsEmpty()
    {
        var map = CreateMap();
        _mindMapRepo.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(map);
        var captured = CaptureAddNodeCalls();

        await _handler.Handle(
            new BatchCreateMindMapNodesCommand(2026, [new("Career", "Branch", null, "", null, null)]),
            CancellationToken.None);

        var branch = captured.SingleOrDefault(n => n.Label == "Career");
        branch.ShouldNotBeNull();
        branch!.IkigaiCategory.ShouldBeNull();
    }

    // ── Leaf creation ────────────────────────────────────────────────────────

    [Fact]
    public async Task Handle_ShouldCreateLeafNode_AttachedToParentBranch()
    {
        var map = CreateMap();
        _mindMapRepo.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(map);
        var captured = CaptureAddNodeCalls();

        var inputs = new List<BatchNodeInput>
        {
            new("Career", "Branch", null, null, null, null),
            new("Side project", "Leaf", "Career", null, null, null),
        };

        await _handler.Handle(new BatchCreateMindMapNodesCommand(2026, inputs), CancellationToken.None);

        var branch = captured.First(n => n.Label == "Career");
        var leaf = captured.First(n => n.Label == "Side project");

        leaf.NodeType.ShouldBe(MindMapNodeType.Leaf);
        leaf.ParentNodeId.ShouldBe(branch.Id);
    }

    [Fact]
    public async Task Handle_ShouldPositionLeaf_RelativeToParentBranch()
    {
        var map = CreateMap();
        _mindMapRepo.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(map);
        var captured = CaptureAddNodeCalls();

        var inputs = new List<BatchNodeInput>
        {
            new("Career", "Branch", null, null, null, null),
            new("Leaf 1", "Leaf", "Career", null, null, null),
            new("Leaf 2", "Leaf", "Career", null, null, null),
        };

        await _handler.Handle(new BatchCreateMindMapNodesCommand(2026, inputs), CancellationToken.None);

        var branch = captured.First(n => n.Label == "Career");
        var leaf1 = captured.First(n => n.Label == "Leaf 1");
        var leaf2 = captured.First(n => n.Label == "Leaf 2");

        leaf1.PositionX.ShouldBe(branch.PositionX);
        leaf1.PositionY.ShouldBe(branch.PositionY + 120);   // leafIdx 0 → 120 * 1

        leaf2.PositionX.ShouldBe(branch.PositionX);
        leaf2.PositionY.ShouldBe(branch.PositionY + 240);   // leafIdx 1 → 120 * 2
    }

    [Fact]
    public async Task Handle_ShouldSkipLeaf_WhenParentLabelNotFound()
    {
        var map = CreateMap();
        _mindMapRepo.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(map);
        var captured = CaptureAddNodeCalls();

        var inputs = new List<BatchNodeInput>
        {
            new("Orphan", "Leaf", "NonExistentBranch", null, null, null),
        };

        await _handler.Handle(new BatchCreateMindMapNodesCommand(2026, inputs), CancellationToken.None);

        captured.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_ShouldSkipLeaf_WhenParentLabelIsNull()
    {
        var map = CreateMap();
        _mindMapRepo.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(map);
        var captured = CaptureAddNodeCalls();

        var inputs = new List<BatchNodeInput>
        {
            new("NoParent", "Leaf", null, null, null, null),
        };

        await _handler.Handle(new BatchCreateMindMapNodesCommand(2026, inputs), CancellationToken.None);

        captured.ShouldBeEmpty();
    }

    // ── Transaction lifecycle ────────────────────────────────────────────────

    [Fact]
    public async Task Handle_ShouldBeginAndCommitTransaction_OnSuccess()
    {
        var map = CreateMap();
        _mindMapRepo.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(map);

        await _handler.Handle(new BatchCreateMindMapNodesCommand(2026, []), CancellationToken.None);

        await _uow.Received(1).BeginTransactionAsync(Arg.Any<CancellationToken>());
        await _uow.Received(1).CommitTransactionAsync(Arg.Any<CancellationToken>());
        await _uow.DidNotReceive().RollbackTransactionAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldRollbackTransaction_WhenExceptionOccurs()
    {
        var map = CreateMap();
        _mindMapRepo.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(map);

        // Force SaveChangesAsync to throw after the transaction has begun
        _uow.SaveChangesAsync(Arg.Any<CancellationToken>())
            .Returns<Task<int>>(_ => throw new InvalidOperationException("DB failure"));

        var inputs = new List<BatchNodeInput>
        {
            new("Career", "Branch", null, null, null, null),
        };

        await Should.ThrowAsync<InvalidOperationException>(async () =>
            await _handler.Handle(new BatchCreateMindMapNodesCommand(2026, inputs), CancellationToken.None));

        await _uow.Received(1).BeginTransactionAsync(Arg.Any<CancellationToken>());
        await _uow.Received(1).RollbackTransactionAsync(Arg.Any<CancellationToken>());
        await _uow.DidNotReceive().CommitTransactionAsync(Arg.Any<CancellationToken>());
    }

    // ── Success result ───────────────────────────────────────────────────────

    [Fact]
    public async Task Handle_ShouldReturnMindMapDto_WhenSuccessful()
    {
        var map = CreateMap();
        _mindMapRepo.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(map);

        var result = await _handler.Handle(
            new BatchCreateMindMapNodesCommand(2026, [new("Career", "Branch", null, null, null, null)]),
            CancellationToken.None);

        result.IsT0.ShouldBeTrue();
    }
}
