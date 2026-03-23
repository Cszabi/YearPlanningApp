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

public class ResendVerificationEmailCommandHandlerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Infrastructure.Persistence.UnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;
    private readonly IEmailService _emailService;
    private readonly IAppSettings _appSettings;
    private readonly ResendVerificationEmailCommandHandler _handler;

    public ResendVerificationEmailCommandHandlerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _uow = new Infrastructure.Persistence.UnitOfWork(_context);

        _currentUser = Substitute.For<ICurrentUserService>();
        _emailService = Substitute.For<IEmailService>();
        _appSettings = Substitute.For<IAppSettings>();
        _appSettings.AppBaseUrl.Returns("https://app.flowkigai.com");

        _handler = new ResendVerificationEmailCommandHandler(
            _uow, _currentUser, _emailService, _appSettings,
            NullLogger<ResendVerificationEmailCommandHandler>.Instance);
    }

    [Fact]
    public async Task Handle_ShouldGenerateNewTokenAndSendEmail_WhenUserIsUnverified()
    {
        var userId = Guid.NewGuid();
        var user = new User { Id = userId, Email = "u@test.com", DisplayName = "U", IsEmailVerified = false };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        _currentUser.UserId.Returns(userId);

        var result = await _handler.Handle(new ResendVerificationEmailCommand(), CancellationToken.None);

        result.ShouldBeOfType<SuccessResult>();

        var updated = await _context.Users.IgnoreQueryFilters().FirstAsync(u => u.Id == userId);
        updated.EmailVerificationTokenHash.ShouldNotBeNullOrEmpty();
        updated.EmailVerificationTokenExpiresAt.ShouldNotBeNull();
        updated.EmailVerificationTokenExpiresAt!.Value.ShouldBeGreaterThan(DateTime.UtcNow);

        await _emailService.Received(1).SendAsync(
            "u@test.com", "U",
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldSucceedSilently_AndNotSendEmail_WhenUserAlreadyVerified()
    {
        var userId = Guid.NewGuid();
        var user = new User { Id = userId, Email = "v@test.com", DisplayName = "V", IsEmailVerified = true };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        _currentUser.UserId.Returns(userId);

        var result = await _handler.Handle(new ResendVerificationEmailCommand(), CancellationToken.None);

        result.ShouldBeOfType<SuccessResult>();
        await _emailService.DidNotReceive().SendAsync(
            Arg.Any<string>(), Arg.Any<string>(),
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldReturnSuccess_EvenWhenEmailServiceThrows()
    {
        var userId = Guid.NewGuid();
        var user = new User { Id = userId, Email = "smtp@test.com", DisplayName = "U", IsEmailVerified = false };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        _currentUser.UserId.Returns(userId);
        _emailService.SendAsync(
                Arg.Any<string>(), Arg.Any<string>(),
                Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns<Task>(_ => throw new Exception("SMTP unavailable"));

        var result = await _handler.Handle(new ResendVerificationEmailCommand(), CancellationToken.None);

        result.ShouldBeOfType<SuccessResult>(); // graceful degradation
    }

    [Fact]
    public async Task Handle_ShouldReplaceToken_WhenCalledMultipleTimes()
    {
        var userId = Guid.NewGuid();
        var user = new User { Id = userId, Email = "re@test.com", DisplayName = "U", IsEmailVerified = false };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        _currentUser.UserId.Returns(userId);

        await _handler.Handle(new ResendVerificationEmailCommand(), CancellationToken.None);
        var firstHash = (await _context.Users.IgnoreQueryFilters().FirstAsync(u => u.Id == userId)).EmailVerificationTokenHash;

        // Detach so EF picks up fresh state
        _context.ChangeTracker.Clear();

        await _handler.Handle(new ResendVerificationEmailCommand(), CancellationToken.None);
        var secondHash = (await _context.Users.IgnoreQueryFilters().FirstAsync(u => u.Id == userId)).EmailVerificationTokenHash;

        firstHash.ShouldNotBeNullOrEmpty();
        secondHash.ShouldNotBeNullOrEmpty();
        firstHash.ShouldNotBe(secondHash); // each call generates a new token
    }

    [Fact]
    public async Task Handle_ShouldSetTokenExpiry_To24HoursFromNow()
    {
        var userId = Guid.NewGuid();
        var user = new User { Id = userId, Email = "expiry@test.com", DisplayName = "U", IsEmailVerified = false };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        _currentUser.UserId.Returns(userId);

        var before = DateTime.UtcNow.AddHours(24).AddSeconds(-5);
        await _handler.Handle(new ResendVerificationEmailCommand(), CancellationToken.None);
        var after = DateTime.UtcNow.AddHours(24).AddSeconds(5);

        var updated = await _context.Users.IgnoreQueryFilters().FirstAsync(u => u.Id == userId);
        updated.EmailVerificationTokenExpiresAt!.Value.ShouldBeInRange(before, after);
    }

    public void Dispose()
    {
        _uow.Dispose();
        _context.Dispose();
    }
}
