using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Admin;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Admin;

public class GetUserDetailQueryHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly GetUserDetailQueryHandler _handler;

    public GetUserDetailQueryHandlerTests()
    {
        _currentUser.IsAdmin.Returns(true);
        _handler = new GetUserDetailQueryHandler(_uow, _currentUser);
    }

    [Fact]
    public async Task Handle_ShouldReturnUserDetail_WhenAdminAndUserExists()
    {
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId, Email = "user@example.com", DisplayName = "User",
            Role = UserRole.User, Plan = UserPlan.Free,
            Goals = new List<Goal>(), FlowSessions = new List<FlowSession>()
        };
        _uow.Users.GetWithDetailsAsync(userId, Arg.Any<CancellationToken>()).Returns(user);

        var result = await _handler.Handle(new GetUserDetailQuery(userId), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Email.ShouldBe("user@example.com");
    }

    [Fact]
    public async Task Handle_ShouldReturnUnauthorizedError_WhenNotAdmin()
    {
        _currentUser.IsAdmin.Returns(false);

        var result = await _handler.Handle(new GetUserDetailQuery(Guid.NewGuid()), CancellationToken.None);

        result.IsT2.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenUserDoesNotExist()
    {
        _uow.Users.GetWithDetailsAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((User?)null);

        var result = await _handler.Handle(new GetUserDetailQuery(Guid.NewGuid()), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }
}
