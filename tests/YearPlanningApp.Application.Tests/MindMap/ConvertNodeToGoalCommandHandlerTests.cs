using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.MindMap;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.MindMap;

public class ConvertNodeToGoalCommandHandlerTests
{
    private readonly IUnitOfWork _uow;
    private readonly IMindMapRepository _mindMapRepo;
    private readonly IGoalRepository _goalRepo;
    private readonly ICurrentUserService _currentUser;
    private readonly ConvertNodeToGoalCommandHandler _handler;

    private static readonly Guid UserId = Guid.NewGuid();

    public ConvertNodeToGoalCommandHandlerTests()
    {
        _uow = Substitute.For<IUnitOfWork>();
        _mindMapRepo = Substitute.For<IMindMapRepository>();
        _goalRepo = Substitute.For<IGoalRepository>();
        _uow.MindMaps.Returns(_mindMapRepo);
        _uow.Goals.Returns(_goalRepo);

        _currentUser = Substitute.For<ICurrentUserService>();
        _currentUser.UserId.Returns(UserId);

        _handler = new ConvertNodeToGoalCommandHandler(_uow, _currentUser);
    }

    [Fact]
    public async Task Handle_ShouldCreateGoalAndUpdateNode_WhenNodeExists()
    {
        var node = new MindMapNode
        {
            Id = Guid.NewGuid(),
            NodeType = MindMapNodeType.Leaf,
            Label = "Launch my podcast",
        };
        var mindMap = new Domain.Entities.MindMap
        {
            Id = Guid.NewGuid(),
            UserId = UserId,
            Year = 2026,
            Nodes = new List<MindMapNode> { node },
        };
        node.MindMapId = mindMap.Id;

        _mindMapRepo.GetByUserAndYearAsync(UserId, 2026, Arg.Any<CancellationToken>())
            .Returns(mindMap);

        var command = new ConvertNodeToGoalCommand(2026, node.Id, GoalType.Project, LifeArea.CreativityHobbies);

        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        var goalDto = result.AsT0;
        goalDto.Title.ShouldBe("Launch my podcast");
        goalDto.GoalType.ShouldBe("Project");
        goalDto.LifeArea.ShouldBe("CreativityHobbies");
        goalDto.Status.ShouldBe("Active");

        node.NodeType.ShouldBe(MindMapNodeType.Goal);
        node.LinkedGoalId.ShouldNotBeNull();

        await _goalRepo.Received(1).AddAsync(Arg.Any<Domain.Entities.Goal>(), Arg.Any<CancellationToken>());
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenMindMapDoesNotExist()
    {
        _mindMapRepo.GetByUserAndYearAsync(UserId, 2026, Arg.Any<CancellationToken>())
            .Returns((Domain.Entities.MindMap?)null);

        var command = new ConvertNodeToGoalCommand(2026, Guid.NewGuid(), GoalType.Project, LifeArea.CareerWork);

        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsT1.ShouldBeTrue();
        result.AsT1.EntityName.ShouldBe("MindMap");
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenNodeDoesNotExist()
    {
        var mindMap = new Domain.Entities.MindMap
        {
            Id = Guid.NewGuid(),
            UserId = UserId,
            Year = 2026,
            Nodes = new List<MindMapNode>(),
        };
        _mindMapRepo.GetByUserAndYearAsync(UserId, 2026, Arg.Any<CancellationToken>())
            .Returns(mindMap);

        var command = new ConvertNodeToGoalCommand(2026, Guid.NewGuid(), GoalType.Project, LifeArea.CareerWork);

        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsT1.ShouldBeTrue();
        result.AsT1.EntityName.ShouldBe("MindMapNode");
    }

    [Fact]
    public async Task Handle_ShouldReturnValidationError_WhenNodeIsAlreadyAGoal()
    {
        var node = new MindMapNode
        {
            Id = Guid.NewGuid(),
            NodeType = MindMapNodeType.Goal,
            Label = "Already a goal",
            LinkedGoalId = Guid.NewGuid(),
        };
        var mindMap = new Domain.Entities.MindMap
        {
            Id = Guid.NewGuid(),
            UserId = UserId,
            Year = 2026,
            Nodes = new List<MindMapNode> { node },
        };
        node.MindMapId = mindMap.Id;

        _mindMapRepo.GetByUserAndYearAsync(UserId, 2026, Arg.Any<CancellationToken>())
            .Returns(mindMap);

        var command = new ConvertNodeToGoalCommand(2026, node.Id, GoalType.Project, LifeArea.CareerWork);

        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsT2.ShouldBeTrue();
        result.AsT2.Errors.ShouldHaveSingleItem();
        result.AsT2.Errors.First().PropertyName.ShouldBe("NodeType");
    }
}
