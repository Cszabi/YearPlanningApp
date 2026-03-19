using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using YearPlanningApp.Application.Auth;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Infrastructure.Persistence;

namespace YearPlanningApp.Application.Tests.Auth;

public class LogoutCommandHandlerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Infrastructure.Persistence.UnitOfWork _uow;
    private readonly IPasswordHasher<User> _hasher;
    private readonly LogoutCommandHandler _handler;

    public LogoutCommandHandlerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _uow = new Infrastructure.Persistence.UnitOfWork(_context);
        _hasher = new PasswordHasher<User>();
        _handler = new LogoutCommandHandler(_uow, _hasher);
    }

    [Fact]
    public async Task Handle_ShouldNullifyRefreshToken_WhenTokenMatches()
    {
        const string rawToken = "my_refresh_token";
        var user = new User { Id = Guid.NewGuid(), Email = "user@example.com", DisplayName = "User" };
        user.RefreshToken = _hasher.HashPassword(user, rawToken);
        user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(7);
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var result = await _handler.Handle(new LogoutCommand(rawToken), CancellationToken.None);

        result.ShouldBeOfType<Application.Common.Models.SuccessResult>();
        var updated = await _context.Users.IgnoreQueryFilters().FirstAsync(u => u.Id == user.Id);
        updated.RefreshToken.ShouldBeNull();
        updated.RefreshTokenExpiresAt.ShouldBeNull();
    }

    [Fact]
    public async Task Handle_ShouldAlwaysReturnSuccess_WhenTokenDoesNotExist()
    {
        var result = await _handler.Handle(new LogoutCommand("nonexistent_token"), CancellationToken.None);

        result.ShouldBeOfType<Application.Common.Models.SuccessResult>();
    }

    [Fact]
    public async Task Handle_ShouldAlwaysReturnSuccess_WhenNoUsersExist()
    {
        var result = await _handler.Handle(new LogoutCommand("any_token"), CancellationToken.None);

        result.ShouldBeOfType<Application.Common.Models.SuccessResult>();
    }

    public void Dispose()
    {
        _uow.Dispose();
        _context.Dispose();
    }
}
