using Mediator;
using Microsoft.AspNetCore.Identity;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Auth;

public record RefreshTokenCommand(string RefreshToken)
    : ICommand<OneOf<AuthResponse, UnauthorizedError>>;

public class RefreshTokenCommandHandler
    : ICommandHandler<RefreshTokenCommand, OneOf<AuthResponse, UnauthorizedError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ITokenService _tokenService;
    private readonly IPasswordHasher<User> _hasher;

    public RefreshTokenCommandHandler(IUnitOfWork uow, ITokenService tokenService, IPasswordHasher<User> hasher)
    {
        _uow = uow;
        _tokenService = tokenService;
        _hasher = hasher;
    }

    public async ValueTask<OneOf<AuthResponse, UnauthorizedError>> Handle(
        RefreshTokenCommand command, CancellationToken ct)
    {
        // Find all users and check the hashed token (no plaintext lookup possible)
        // In production this would use a dedicated token lookup table; for now scan active users
        var allUsers = await _uow.Users.GetAllAsync(ct);
        User? user = null;

        foreach (var candidate in allUsers)
        {
            if (candidate.RefreshToken is null) continue;
            if (candidate.RefreshTokenExpiresAt < DateTime.UtcNow) continue;

            var result = _hasher.VerifyHashedPassword(candidate, candidate.RefreshToken, command.RefreshToken);
            if (result != PasswordVerificationResult.Failed)
            {
                user = candidate;
                break;
            }
        }

        if (user is null)
            return new UnauthorizedError("Refresh token is invalid or expired.");

        var (accessToken, expiresAt) = _tokenService.GenerateAccessToken(user);
        var rawRefresh = _tokenService.GenerateRefreshToken();
        user.RefreshToken = _hasher.HashPassword(user, rawRefresh);
        user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(7);

        _uow.Users.Update(user);
        await _uow.SaveChangesAsync(ct);

        return new AuthResponse(user.Id, user.Email, user.DisplayName, accessToken, rawRefresh, expiresAt, user.CalendarProvider, user.Role.ToString(), user.Plan.ToString(), user.IsEmailVerified);
    }
}
