using Mediator;
using Microsoft.AspNetCore.Identity;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Auth;

public record LogoutCommand(string RefreshToken) : ICommand<SuccessResult>;

public class LogoutCommandHandler : ICommandHandler<LogoutCommand, SuccessResult>
{
    private readonly IUnitOfWork _uow;
    private readonly IPasswordHasher<User> _hasher;

    public LogoutCommandHandler(IUnitOfWork uow, IPasswordHasher<User> hasher)
    {
        _uow = uow;
        _hasher = hasher;
    }

    public async ValueTask<SuccessResult> Handle(LogoutCommand command, CancellationToken ct)
    {
        var allUsers = await _uow.Users.GetAllAsync(ct);

        foreach (var user in allUsers)
        {
            if (user.RefreshToken is null) continue;

            var result = _hasher.VerifyHashedPassword(user, user.RefreshToken, command.RefreshToken);
            if (result != PasswordVerificationResult.Failed)
            {
                user.RefreshToken = null;
                user.RefreshTokenExpiresAt = null;
                _uow.Users.Update(user);
                await _uow.SaveChangesAsync(ct);
                break;
            }
        }

        return new SuccessResult(); // always succeed — don't reveal token validity
    }
}
