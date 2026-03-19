using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Admin;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Admin;

public class UpdateUserPlanCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly UpdateUserPlanCommandHandler _handler;

    public UpdateUserPlanCommandHandlerTests()
    {
        _currentUser.IsAdmin.Returns(true);
        _handler = new UpdateUserPlanCommandHandler(_uow, _currentUser);
    }

    private User BuildUser(UserPlan plan = UserPlan.Free) => new()
    {
        Id = Guid.NewGuid(), Email = "user@example.com", DisplayName = "User",
        Role = UserRole.User, Plan = plan,
        Goals = new List<Goal>(), FlowSessions = new List<FlowSession>()
    };

    [Fact]
    public async Task Handle_ShouldUpgradePlan_WhenAdminAndUserExists()
    {
        var user = BuildUser();
        _uow.Users.GetWithDetailsAsync(user.Id, Arg.Any<CancellationToken>()).Returns(user);

        var result = await _handler.Handle(new UpdateUserPlanCommand(user.Id, "Pro"), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Plan.ShouldBe("Pro");
        user.Plan.ShouldBe(UserPlan.Pro);
    }

    [Fact]
    public async Task Handle_ShouldReturnUnauthorizedError_WhenNotAdmin()
    {
        _currentUser.IsAdmin.Returns(false);

        var result = await _handler.Handle(new UpdateUserPlanCommand(Guid.NewGuid(), "Pro"), CancellationToken.None);

        result.IsT2.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenUserDoesNotExist()
    {
        _uow.Users.GetWithDetailsAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((User?)null);

        var result = await _handler.Handle(new UpdateUserPlanCommand(Guid.NewGuid(), "Pro"), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }
}
