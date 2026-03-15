using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
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
        _handler = new RegisterCommandHandler(_uow, _tokenService, _hasher);
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

    public void Dispose()
    {
        _uow.Dispose();
        _context.Dispose();
    }
}
