using FluentValidation;
using Mediator;
using Microsoft.AspNetCore.Identity;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Auth;

public record LoginCommand(string Email, string Password)
    : ICommand<OneOf<AuthResponse, NotFoundError, ValidationError>>;

public class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}

public class LoginCommandHandler
    : ICommandHandler<LoginCommand, OneOf<AuthResponse, NotFoundError, ValidationError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ITokenService _tokenService;
    private readonly IPasswordHasher<User> _hasher;

    public LoginCommandHandler(IUnitOfWork uow, ITokenService tokenService, IPasswordHasher<User> hasher)
    {
        _uow = uow;
        _tokenService = tokenService;
        _hasher = hasher;
    }

    public async ValueTask<OneOf<AuthResponse, NotFoundError, ValidationError>> Handle(
        LoginCommand command, CancellationToken ct)
    {
        var user = await _uow.Users.GetByEmailAsync(command.Email.ToLowerInvariant(), ct);
        if (user is null)
            return new NotFoundError("User", Guid.Empty);

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, command.Password);
        if (result == PasswordVerificationResult.Failed)
            return new NotFoundError("User", Guid.Empty); // don't reveal which field was wrong

        var (accessToken, expiresAt) = _tokenService.GenerateAccessToken(user);
        var rawRefresh = _tokenService.GenerateRefreshToken();
        user.RefreshToken = _hasher.HashPassword(user, rawRefresh);
        user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(7);

        _uow.Users.Update(user);
        await _uow.SaveChangesAsync(ct);

        return new AuthResponse(user.Id, user.Email, user.DisplayName, accessToken, rawRefresh, expiresAt, user.CalendarProvider);
    }
}
