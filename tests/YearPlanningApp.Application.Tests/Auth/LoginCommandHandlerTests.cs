using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Auth;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Infrastructure.Persistence;

namespace YearPlanningApp.Application.Tests.Auth;

public class LoginCommandHandlerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Infrastructure.Persistence.UnitOfWork _uow;
    private readonly ITokenService _tokenService;
    private readonly IPasswordHasher<User> _hasher;
    private readonly LoginCommandHandler _handler;

    public LoginCommandHandlerTests()
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
        _handler = new LoginCommandHandler(_uow, _tokenService, _hasher);
    }

    [Fact]
    public async Task Handle_ShouldReturnAuthResponse_WhenCredentialsAreValid()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "user@example.com",
            DisplayName = "Test User"
        };
        user.PasswordHash = _hasher.HashPassword(user, "Password123!");
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var result = await _handler.Handle(new LoginCommand("user@example.com", "Password123!"), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Email.ShouldBe("user@example.com");
        result.AsT0.AccessToken.ShouldBe("access_token");
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenEmailDoesNotExist()
    {
        var result = await _handler.Handle(new LoginCommand("nobody@example.com", "any"), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenPasswordIsWrong()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "wrong@example.com",
            DisplayName = "User"
        };
        user.PasswordHash = _hasher.HashPassword(user, "CorrectPassword!");
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var result = await _handler.Handle(new LoginCommand("wrong@example.com", "WrongPassword!"), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldNormaliseEmailToLowercase()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "mixed@example.com",
            DisplayName = "User"
        };
        user.PasswordHash = _hasher.HashPassword(user, "Password123!");
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var result = await _handler.Handle(new LoginCommand("MIXED@EXAMPLE.COM", "Password123!"), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
    }

    public void Dispose()
    {
        _uow.Dispose();
        _context.Dispose();
    }
}
