using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using YearPlanningApp.Application.Auth;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Infrastructure.Persistence;

namespace YearPlanningApp.Application.Tests.Auth;

public class VerifyEmailCommandHandlerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Infrastructure.Persistence.UnitOfWork _uow;
    private readonly VerifyEmailCommandHandler _handler;

    public VerifyEmailCommandHandlerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _uow = new Infrastructure.Persistence.UnitOfWork(_context);
        _handler = new VerifyEmailCommandHandler(_uow);
    }

    private static (string plainToken, string tokenHash) GenerateToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        var plain = Convert.ToHexString(bytes).ToLowerInvariant();
        var hash = Convert.ToHexString(
            SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(plain))
        ).ToLowerInvariant();
        return (plain, hash);
    }

    [Fact]
    public async Task Handle_ShouldMarkUserVerified_WhenTokenIsValid()
    {
        var (plain, hash) = GenerateToken();
        var user = new User
        {
            Id = Guid.NewGuid(), Email = "u@test.com", DisplayName = "U",
            IsEmailVerified = false,
            EmailVerificationTokenHash = hash,
            EmailVerificationTokenExpiresAt = DateTime.UtcNow.AddHours(24),
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var result = await _handler.Handle(new VerifyEmailCommand(plain), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        var updated = await _context.Users.IgnoreQueryFilters().FirstAsync(u => u.Id == user.Id);
        updated.IsEmailVerified.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldClearTokenFields_AfterVerification()
    {
        var (plain, hash) = GenerateToken();
        var user = new User
        {
            Id = Guid.NewGuid(), Email = "clear@test.com", DisplayName = "U",
            IsEmailVerified = false,
            EmailVerificationTokenHash = hash,
            EmailVerificationTokenExpiresAt = DateTime.UtcNow.AddHours(24),
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        await _handler.Handle(new VerifyEmailCommand(plain), CancellationToken.None);

        var updated = await _context.Users.IgnoreQueryFilters().FirstAsync(u => u.Id == user.Id);
        updated.EmailVerificationTokenHash.ShouldBeNull();
        updated.EmailVerificationTokenExpiresAt.ShouldBeNull();
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFound_WhenTokenDoesNotExist()
    {
        var result = await _handler.Handle(new VerifyEmailCommand("nonexistent_token"), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFound_WhenTokenIsExpired()
    {
        var (plain, hash) = GenerateToken();
        var user = new User
        {
            Id = Guid.NewGuid(), Email = "expired@test.com", DisplayName = "U",
            IsEmailVerified = false,
            EmailVerificationTokenHash = hash,
            EmailVerificationTokenExpiresAt = DateTime.UtcNow.AddMinutes(-5), // in the past
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var result = await _handler.Handle(new VerifyEmailCommand(plain), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFound_WhenTokenIsReused()
    {
        var (plain, hash) = GenerateToken();
        var user = new User
        {
            Id = Guid.NewGuid(), Email = "reuse@test.com", DisplayName = "U",
            IsEmailVerified = false,
            EmailVerificationTokenHash = hash,
            EmailVerificationTokenExpiresAt = DateTime.UtcNow.AddHours(24),
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        await _handler.Handle(new VerifyEmailCommand(plain), CancellationToken.None); // first use — succeeds
        var second = await _handler.Handle(new VerifyEmailCommand(plain), CancellationToken.None); // reuse — should fail

        second.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldNotChangeVerificationStatus_WhenTokenIsExpired()
    {
        var (plain, hash) = GenerateToken();
        var user = new User
        {
            Id = Guid.NewGuid(), Email = "nochange@test.com", DisplayName = "U",
            IsEmailVerified = false,
            EmailVerificationTokenHash = hash,
            EmailVerificationTokenExpiresAt = DateTime.UtcNow.AddMinutes(-1),
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        await _handler.Handle(new VerifyEmailCommand(plain), CancellationToken.None);

        var updated = await _context.Users.IgnoreQueryFilters().FirstAsync(u => u.Id == user.Id);
        updated.IsEmailVerified.ShouldBeFalse(); // still unverified
    }

    public void Dispose()
    {
        _uow.Dispose();
        _context.Dispose();
    }
}
