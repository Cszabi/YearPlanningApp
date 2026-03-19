using System.Security.Cryptography;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using YearPlanningApp.Application.Auth;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Infrastructure.Persistence;

namespace YearPlanningApp.Application.Tests.Auth;

public class ResetPasswordCommandHandlerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Infrastructure.Persistence.UnitOfWork _uow;
    private readonly IPasswordHasher<User> _hasher;
    private readonly ResetPasswordCommandHandler _handler;

    public ResetPasswordCommandHandlerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _uow = new Infrastructure.Persistence.UnitOfWork(_context);
        _hasher = new PasswordHasher<User>();
        _handler = new ResetPasswordCommandHandler(_uow, _hasher);
    }

    private static (string plainToken, string tokenHash) GenerateToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        var plain = Convert.ToHexString(bytes).ToLowerInvariant();
        var hash = Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(plain))).ToLowerInvariant();
        return (plain, hash);
    }

    [Fact]
    public async Task Handle_ShouldResetPassword_WhenTokenIsValid()
    {
        var (plainToken, tokenHash) = GenerateToken();
        var user = new User { Id = Guid.NewGuid(), Email = "user@example.com", DisplayName = "User" };
        user.PasswordHash = _hasher.HashPassword(user, "OldPassword!");
        user.PasswordResetTokenHash = tokenHash;
        user.PasswordResetTokenExpiresAt = DateTime.UtcNow.AddMinutes(30);
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var result = await _handler.Handle(new ResetPasswordCommand(plainToken, "NewPassword123!"), CancellationToken.None);

        result.IsT0.ShouldBeTrue();

        var updated = await _context.Users.IgnoreQueryFilters().FirstAsync(u => u.Id == user.Id);
        updated.PasswordResetTokenHash.ShouldBeNull();
        updated.PasswordResetTokenExpiresAt.ShouldBeNull();
        var verify = _hasher.VerifyHashedPassword(updated, updated.PasswordHash, "NewPassword123!");
        verify.ShouldNotBe(PasswordVerificationResult.Failed);
    }

    [Fact]
    public async Task Handle_ShouldReturnUnauthorizedError_WhenTokenIsExpired()
    {
        var (plainToken, tokenHash) = GenerateToken();
        var user = new User { Id = Guid.NewGuid(), Email = "expired@example.com", DisplayName = "User" };
        user.PasswordResetTokenHash = tokenHash;
        user.PasswordResetTokenExpiresAt = DateTime.UtcNow.AddMinutes(-5); // expired
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var result = await _handler.Handle(new ResetPasswordCommand(plainToken, "NewPassword123!"), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnUnauthorizedError_WhenTokenNotFound()
    {
        var result = await _handler.Handle(new ResetPasswordCommand("nonexistent_token", "NewPassword123!"), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldClearToken_AfterSuccessfulReset()
    {
        var (plainToken, tokenHash) = GenerateToken();
        var user = new User { Id = Guid.NewGuid(), Email = "clear@example.com", DisplayName = "User" };
        user.PasswordHash = _hasher.HashPassword(user, "Old!");
        user.PasswordResetTokenHash = tokenHash;
        user.PasswordResetTokenExpiresAt = DateTime.UtcNow.AddHours(1);
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        await _handler.Handle(new ResetPasswordCommand(plainToken, "NewPassword123!"), CancellationToken.None);

        // Re-using the same token should fail
        var result2 = await _handler.Handle(new ResetPasswordCommand(plainToken, "AnotherPassword!"), CancellationToken.None);
        result2.IsT1.ShouldBeTrue();
    }

    public void Dispose()
    {
        _uow.Dispose();
        _context.Dispose();
    }
}
