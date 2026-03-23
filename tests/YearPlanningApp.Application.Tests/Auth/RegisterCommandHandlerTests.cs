using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Auth;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Infrastructure.Persistence;

namespace YearPlanningApp.Application.Tests.Auth;

public class RegisterCommandHandlerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Infrastructure.Persistence.UnitOfWork _uow;
    private readonly ITokenService _tokenService;
    private readonly IPasswordHasher<User> _hasher;
    private readonly IEmailService _emailService;
    private readonly IAppSettings _appSettings;
    private readonly RegisterCommandHandler _handler;

    public RegisterCommandHandlerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _uow = new Infrastructure.Persistence.UnitOfWork(_context);

        _tokenService = Substitute.For<ITokenService>();
        _tokenService.GenerateAccessToken(Arg.Any<User>())
            .Returns(("access_token", DateTime.UtcNow.AddMinutes(15)));
        _tokenService.GenerateRefreshToken().Returns("refresh_token");

        _hasher = new PasswordHasher<User>();

        _emailService = Substitute.For<IEmailService>();
        _appSettings = Substitute.For<IAppSettings>();
        _appSettings.AppBaseUrl.Returns("https://app.flowkigai.com");

        _handler = new RegisterCommandHandler(
            _uow, _tokenService, _hasher, _emailService, _appSettings,
            NullLogger<RegisterCommandHandler>.Instance);
    }

    [Fact]
    public async Task Handle_ShouldReturnAuthResponse_WhenEmailIsUnique()
    {
        var command = new RegisterCommand("test@example.com", "Test User", "Password123!", null);

        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        var auth = result.AsT0;
        auth.Email.ShouldBe("test@example.com");
        auth.DisplayName.ShouldBe("Test User");
        auth.AccessToken.ShouldBe("access_token");
    }

    [Fact]
    public async Task Handle_ShouldReturnConflictError_WhenEmailAlreadyExists()
    {
        var command = new RegisterCommand("existing@example.com", "User", "Password123!", null);
        await _handler.Handle(command, CancellationToken.None); // first registration

        var result = await _handler.Handle(command, CancellationToken.None); // duplicate

        result.IsT2.ShouldBeTrue();
        result.AsT2.Message.ShouldContain("already exists");
    }

    [Fact]
    public async Task Handle_ShouldHashPassword_NotStoreRaw()
    {
        var command = new RegisterCommand("hash@example.com", "User", "Password123!", null);

        await _handler.Handle(command, CancellationToken.None);

        var user = await _context.Users.IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == "hash@example.com");
        user.ShouldNotBeNull();
        user!.PasswordHash.ShouldNotBe("Password123!");
        user.PasswordHash.ShouldNotBeNullOrEmpty();
    }

    [Fact]
    public async Task Handle_ShouldLowercaseEmail()
    {
        var command = new RegisterCommand("UPPER@Example.COM", "User", "Password123!", null);

        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Email.ShouldBe("upper@example.com");
    }

    // ── Email verification ────────────────────────────────────────────────────

    [Fact]
    public async Task Handle_ShouldSetIsEmailVerifiedFalse_OnNewRegistration()
    {
        var command = new RegisterCommand("new@example.com", "New User", "Password123!", null);

        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.IsEmailVerified.ShouldBeFalse();

        var user = await _context.Users.IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == "new@example.com");
        user.ShouldNotBeNull();
        user!.IsEmailVerified.ShouldBeFalse();
    }

    [Fact]
    public async Task Handle_ShouldStoreVerificationTokenHash_OnNewRegistration()
    {
        var command = new RegisterCommand("verify@example.com", "User", "Password123!", null);

        await _handler.Handle(command, CancellationToken.None);

        var user = await _context.Users.IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == "verify@example.com");
        user.ShouldNotBeNull();
        user!.EmailVerificationTokenHash.ShouldNotBeNullOrEmpty();
        user.EmailVerificationTokenExpiresAt.ShouldNotBeNull();
        user.EmailVerificationTokenExpiresAt!.Value.ShouldBeGreaterThan(DateTime.UtcNow);
    }

    [Fact]
    public async Task Handle_ShouldSendVerificationEmail_OnNewRegistration()
    {
        var command = new RegisterCommand("email@example.com", "Email User", "Password123!", null);

        await _handler.Handle(command, CancellationToken.None);

        await _emailService.Received(1).SendAsync(
            "email@example.com",
            "Email User",
            Arg.Any<string>(),
            Arg.Any<string>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldSucceed_EvenWhenEmailServiceThrows()
    {
        _emailService.SendAsync(
                Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(),
                Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns<Task>(_ => throw new Exception("SMTP unavailable"));

        var command = new RegisterCommand("smtp@example.com", "User", "Password123!", null);

        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsT0.ShouldBeTrue(); // registration still succeeds
    }

    public void Dispose()
    {
        _uow.Dispose();
        _context.Dispose();
    }
}
