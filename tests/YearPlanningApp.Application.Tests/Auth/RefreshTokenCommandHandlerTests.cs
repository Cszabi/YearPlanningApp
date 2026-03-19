using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Auth;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Infrastructure.Persistence;

namespace YearPlanningApp.Application.Tests.Auth;

public class RefreshTokenCommandHandlerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Infrastructure.Persistence.UnitOfWork _uow;
    private readonly ITokenService _tokenService;
    private readonly IPasswordHasher<User> _hasher;
    private readonly RefreshTokenCommandHandler _handler;

    public RefreshTokenCommandHandlerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _uow = new Infrastructure.Persistence.UnitOfWork(_context);

        _tokenService = Substitute.For<ITokenService>();
        _tokenService.GenerateAccessToken(Arg.Any<User>())
            .Returns(("new_access_token", DateTime.UtcNow.AddMinutes(15)));
        _tokenService.GenerateRefreshToken().Returns("new_refresh_token");

        _hasher = new PasswordHasher<User>();
        _handler = new RefreshTokenCommandHandler(_uow, _tokenService, _hasher);
    }

    [Fact]
    public async Task Handle_ShouldReturnNewTokens_WhenRefreshTokenIsValid()
    {
        const string rawToken = "valid_refresh_token";
        var user = new User { Id = Guid.NewGuid(), Email = "user@example.com", DisplayName = "User" };
        user.RefreshToken = _hasher.HashPassword(user, rawToken);
        user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(7);
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var result = await _handler.Handle(new RefreshTokenCommand(rawToken), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.AccessToken.ShouldBe("new_access_token");
    }

    [Fact]
    public async Task Handle_ShouldReturnUnauthorizedError_WhenTokenHasExpired()
    {
        const string rawToken = "expired_refresh_token";
        var user = new User { Id = Guid.NewGuid(), Email = "user2@example.com", DisplayName = "User" };
        user.RefreshToken = _hasher.HashPassword(user, rawToken);
        user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(-1); // expired
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var result = await _handler.Handle(new RefreshTokenCommand(rawToken), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnUnauthorizedError_WhenTokenNotFound()
    {
        var result = await _handler.Handle(new RefreshTokenCommand("nonexistent_token"), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldRotateRefreshToken_OnSuccess()
    {
        const string rawToken = "old_refresh_token";
        var user = new User { Id = Guid.NewGuid(), Email = "user3@example.com", DisplayName = "User" };
        user.RefreshToken = _hasher.HashPassword(user, rawToken);
        user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(7);
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        await _handler.Handle(new RefreshTokenCommand(rawToken), CancellationToken.None);

        // Old token can no longer be used
        var result2 = await _handler.Handle(new RefreshTokenCommand(rawToken), CancellationToken.None);
        result2.IsT1.ShouldBeTrue();
    }

    public void Dispose()
    {
        _uow.Dispose();
        _context.Dispose();
    }
}
