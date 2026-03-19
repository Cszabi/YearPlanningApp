using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Auth;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Infrastructure.Persistence;

namespace YearPlanningApp.Application.Tests.Auth;

public class ForgotPasswordCommandHandlerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Infrastructure.Persistence.UnitOfWork _uow;
    private readonly IEmailService _emailService;
    private readonly IAppSettings _appSettings;
    private readonly ForgotPasswordCommandHandler _handler;

    public ForgotPasswordCommandHandlerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _uow = new Infrastructure.Persistence.UnitOfWork(_context);

        _emailService = Substitute.For<IEmailService>();
        _appSettings = Substitute.For<IAppSettings>();
        _appSettings.AppBaseUrl.Returns("https://app.flowkigai.com");

        _handler = new ForgotPasswordCommandHandler(
            _uow,
            _emailService,
            _appSettings,
            NullLogger<ForgotPasswordCommandHandler>.Instance);
    }

    [Fact]
    public async Task Handle_ShouldStoreTokenHashAndSendEmail_WhenEmailExists()
    {
        var user = new User { Id = Guid.NewGuid(), Email = "user@example.com", DisplayName = "User" };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var result = await _handler.Handle(new ForgotPasswordCommand("user@example.com"), CancellationToken.None);

        result.ShouldBeOfType<Application.Common.Models.SuccessResult>();

        var updated = await _context.Users.IgnoreQueryFilters().FirstAsync(u => u.Id == user.Id);
        updated.PasswordResetTokenHash.ShouldNotBeNullOrEmpty();
        updated.PasswordResetTokenExpiresAt.ShouldNotBeNull();
        updated.PasswordResetTokenExpiresAt!.Value.ShouldBeGreaterThan(DateTime.UtcNow);

        await _emailService.Received(1).SendAsync(
            "user@example.com",
            "User",
            Arg.Any<string>(),
            Arg.Any<string>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldReturnSuccess_AndNotSendEmail_WhenEmailDoesNotExist()
    {
        var result = await _handler.Handle(new ForgotPasswordCommand("nobody@example.com"), CancellationToken.None);

        result.ShouldBeOfType<Application.Common.Models.SuccessResult>();
        await _emailService.DidNotReceive().SendAsync(
            Arg.Any<string>(),
            Arg.Any<string>(),
            Arg.Any<string>(),
            Arg.Any<string>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldReturnSuccess_EvenWhenEmailServiceThrows()
    {
        var user = new User { Id = Guid.NewGuid(), Email = "smtp@example.com", DisplayName = "User" };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        _emailService.SendAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns<Task>(_ => throw new Exception("SMTP unavailable"));

        var result = await _handler.Handle(new ForgotPasswordCommand("smtp@example.com"), CancellationToken.None);

        result.ShouldBeOfType<Application.Common.Models.SuccessResult>();
    }

    [Fact]
    public async Task Handle_ShouldSetTokenExpiry_ToOneHourFromNow()
    {
        var user = new User { Id = Guid.NewGuid(), Email = "expiry@example.com", DisplayName = "User" };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var before = DateTime.UtcNow.AddHours(1).AddSeconds(-5);
        await _handler.Handle(new ForgotPasswordCommand("expiry@example.com"), CancellationToken.None);
        var after = DateTime.UtcNow.AddHours(1).AddSeconds(5);

        var updated = await _context.Users.IgnoreQueryFilters().FirstAsync(u => u.Id == user.Id);
        updated.PasswordResetTokenExpiresAt!.Value.ShouldBeInRange(before, after);
    }

    public void Dispose()
    {
        _uow.Dispose();
        _context.Dispose();
    }
}
