using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Goals;

public class GetTodaysTasksQueryHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly GetTodaysTasksQueryHandler _handler;

    public GetTodaysTasksQueryHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new GetTodaysTasksQueryHandler(_uow, _currentUser);
    }

    private static TaskItem BuildTask() => new()
    {
        Id = Guid.NewGuid(), GoalId = Guid.NewGuid(), MilestoneId = Guid.NewGuid(),
        Title = "Task due today", Status = TaskItemStatus.NotStarted, EnergyLevel = EnergyLevel.Deep,
        DueDate = DateTime.UtcNow.Date
    };

    [Fact]
    public async Task Handle_ShouldReturnTodaysTasks()
    {
        var tasks = new[] { BuildTask(), BuildTask() };
        _uow.Tasks.GetTodaysTasksAsync(_userId, Arg.Any<CancellationToken>()).Returns(tasks);

        var result = await _handler.Handle(new GetTodaysTasksQuery(), CancellationToken.None);

        result.Count().ShouldBe(2);
    }

    [Fact]
    public async Task Handle_ShouldReturnEmptyList_WhenNoTasksDueToday()
    {
        _uow.Tasks.GetTodaysTasksAsync(_userId, Arg.Any<CancellationToken>()).Returns(Array.Empty<TaskItem>());

        var result = await _handler.Handle(new GetTodaysTasksQuery(), CancellationToken.None);

        result.ShouldBeEmpty();
    }
}
