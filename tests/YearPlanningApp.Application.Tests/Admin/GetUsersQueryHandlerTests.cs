using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Admin;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Admin;

public class GetUsersQueryHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly GetUsersQueryHandler _handler;

    public GetUsersQueryHandlerTests()
    {
        _handler = new GetUsersQueryHandler(_uow, _currentUser);
    }

    private User BuildUser() => new()
    {
        Id = Guid.NewGuid(), Email = "user@example.com", DisplayName = "User",
        Role = UserRole.User, Plan = UserPlan.Free,
        Goals = new List<Goal>(), FlowSessions = new List<FlowSession>()
    };

    [Fact]
    public async Task Handle_ShouldReturnUserList_WhenAdmin()
    {
        _currentUser.IsAdmin.Returns(true);
        var users = new[] { BuildUser(), BuildUser() };
        _uow.Users.GetAllWithCountsAsync(Arg.Any<CancellationToken>()).Returns(users);

        var result = await _handler.Handle(new GetUsersQuery(), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Count.ShouldBe(2);
    }

    [Fact]
    public async Task Handle_ShouldReturnUnauthorizedError_WhenNotAdmin()
    {
        _currentUser.IsAdmin.Returns(false);

        var result = await _handler.Handle(new GetUsersQuery(), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
        await _uow.Users.DidNotReceive().GetAllWithCountsAsync(Arg.Any<CancellationToken>());
    }
}
