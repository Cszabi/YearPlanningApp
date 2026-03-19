using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Admin;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Admin;

public class DeleteUserCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _adminId = Guid.NewGuid();
    private readonly DeleteUserCommandHandler _handler;

    public DeleteUserCommandHandlerTests()
    {
        _currentUser.IsAdmin.Returns(true);
        _currentUser.UserId.Returns(_adminId);
        _handler = new DeleteUserCommandHandler(_uow, _currentUser);
    }

    [Fact]
    public async Task Handle_ShouldDeleteUser_WhenAdminAndTargetExists()
    {
        var targetId = Guid.NewGuid();
        var target = new User { Id = targetId, Email = "t@example.com", DisplayName = "Target" };
        _uow.Users.GetByIdAsync(targetId, Arg.Any<CancellationToken>()).Returns(target);

        var result = await _handler.Handle(new DeleteUserCommand(targetId), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        _uow.Users.Received(1).Remove(target);
    }

    [Fact]
    public async Task Handle_ShouldReturnUnauthorizedError_WhenNotAdmin()
    {
        _currentUser.IsAdmin.Returns(false);

        var result = await _handler.Handle(new DeleteUserCommand(Guid.NewGuid()), CancellationToken.None);

        result.IsT2.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnUnauthorizedError_WhenDeletingSelf()
    {
        var result = await _handler.Handle(new DeleteUserCommand(_adminId), CancellationToken.None);

        result.IsT2.ShouldBeTrue();
        _uow.Users.DidNotReceive().Remove(Arg.Any<User>());
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenTargetDoesNotExist()
    {
        _uow.Users.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((User?)null);

        var result = await _handler.Handle(new DeleteUserCommand(Guid.NewGuid()), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }
}
