using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.MindMap;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.MindMap;

public class GetNodesByDeadlineQueryHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly GetNodesByDeadlineQueryHandler _handler;

    public GetNodesByDeadlineQueryHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new GetNodesByDeadlineQueryHandler(_uow, _currentUser);
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenMindMapDoesNotExist()
    {
        _uow.MindMaps.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns((Domain.Entities.MindMap?)null);

        var result = await _handler.Handle(new GetNodesByDeadlineQuery(2026, 30), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnEmptyList_WhenNoLinkedGoalNodes()
    {
        var map = new Domain.Entities.MindMap
        {
            Id = Guid.NewGuid(), UserId = _userId, Year = 2026,
            Nodes = new List<MindMapNode>
            {
                new() { Id = Guid.NewGuid(), Label = "Root", NodeType = MindMapNodeType.Root, LinkedGoalId = null, PositionX = 0, PositionY = 0 }
            }
        };
        _uow.MindMaps.GetByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(map);

        var result = await _handler.Handle(new GetNodesByDeadlineQuery(2026, 30), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.ShouldBeEmpty();
    }
}
