using Microsoft.AspNetCore.Identity;
using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Auth;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Auth;

public class DeleteAccountCommandHandlerTests
{
    private readonly IUnitOfWork _uow;
    private readonly IPasswordHasher<User> _hasher;
    private readonly ICurrentUserService _currentUser;
    private readonly DeleteAccountCommandHandler _handler;
    private readonly Guid _userId = Guid.NewGuid();

    public DeleteAccountCommandHandlerTests()
    {
        _uow = Substitute.For<IUnitOfWork>();
        _hasher = new PasswordHasher<User>();
        _currentUser = Substitute.For<ICurrentUserService>();
        _currentUser.UserId.Returns(_userId);
        _handler = new DeleteAccountCommandHandler(_uow, _hasher, _currentUser);
    }

    [Fact]
    public async Task Handle_ShouldDeleteAccount_WhenPasswordIsCorrect()
    {
        var user = new User { Id = _userId, Email = "user@example.com", DisplayName = "User" };
        user.PasswordHash = _hasher.HashPassword(user, "CorrectPass!");
        _uow.Users.GetByIdAsync(_userId, Arg.Any<CancellationToken>()).Returns(user);

        var result = await _handler.Handle(new DeleteAccountCommand("CorrectPass!"), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        await _uow.Received(1).PermanentlyDeleteUserAsync(_userId, Arg.Any<CancellationToken>());
        await _uow.Received(1).CommitTransactionAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldReturnUnauthorizedError_WhenPasswordIsWrong()
    {
        var user = new User { Id = _userId, Email = "user@example.com", DisplayName = "User" };
        user.PasswordHash = _hasher.HashPassword(user, "CorrectPass!");
        _uow.Users.GetByIdAsync(_userId, Arg.Any<CancellationToken>()).Returns(user);

        var result = await _handler.Handle(new DeleteAccountCommand("WrongPass!"), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
        await _uow.DidNotReceive().PermanentlyDeleteUserAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldReturnUnauthorizedError_WhenUserNotFound()
    {
        _uow.Users.GetByIdAsync(_userId, Arg.Any<CancellationToken>()).Returns((User?)null);

        var result = await _handler.Handle(new DeleteAccountCommand("any"), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldRollbackTransaction_WhenDeleteThrows()
    {
        var user = new User { Id = _userId, Email = "user@example.com", DisplayName = "User" };
        user.PasswordHash = _hasher.HashPassword(user, "CorrectPass!");
        _uow.Users.GetByIdAsync(_userId, Arg.Any<CancellationToken>()).Returns(user);
        _uow.PermanentlyDeleteUserAsync(_userId, Arg.Any<CancellationToken>())
            .Returns<Task>(_ => throw new Exception("DB error"));

        await Should.ThrowAsync<Exception>(
            () => _handler.Handle(new DeleteAccountCommand("CorrectPass!"), CancellationToken.None).AsTask());

        await _uow.Received(1).RollbackTransactionAsync(Arg.Any<CancellationToken>());
    }
}
