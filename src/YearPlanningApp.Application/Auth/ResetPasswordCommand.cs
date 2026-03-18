using System.Security.Cryptography;
using FluentValidation;
using Mediator;
using Microsoft.AspNetCore.Identity;
using OneOf;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Auth;

public record ResetPasswordCommand(string Token, string NewPassword)
    : ICommand<OneOf<SuccessResult, UnauthorizedError, ValidationError>>;

public class ResetPasswordCommandValidator : AbstractValidator<ResetPasswordCommand>
{
    public ResetPasswordCommandValidator()
    {
        RuleFor(x => x.Token).NotEmpty();
        RuleFor(x => x.NewPassword).NotEmpty().MinimumLength(8).MaximumLength(128);
    }
}

public class ResetPasswordCommandHandler
    : ICommandHandler<ResetPasswordCommand, OneOf<SuccessResult, UnauthorizedError, ValidationError>>
{
    private readonly IUnitOfWork _uow;
    private readonly IPasswordHasher<User> _hasher;

    public ResetPasswordCommandHandler(IUnitOfWork uow, IPasswordHasher<User> hasher)
    {
        _uow = uow;
        _hasher = hasher;
    }

    public async ValueTask<OneOf<SuccessResult, UnauthorizedError, ValidationError>> Handle(
        ResetPasswordCommand command, CancellationToken ct)
    {
        var tokenHash = Convert.ToHexString(
            SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(command.Token))
        ).ToLowerInvariant();

        var user = await _uow.Users.GetByPasswordResetTokenHashAsync(tokenHash, ct);
        if (user is null)
            return new UnauthorizedError("Invalid or expired password reset token.");

        if (user.PasswordResetTokenExpiresAt is null || user.PasswordResetTokenExpiresAt < DateTime.UtcNow)
            return new UnauthorizedError("Password reset token has expired.");

        user.PasswordHash = _hasher.HashPassword(user, command.NewPassword);
        user.PasswordResetTokenHash = null;
        user.PasswordResetTokenExpiresAt = null;

        _uow.Users.Update(user);
        await _uow.SaveChangesAsync(ct);

        return new SuccessResult();
    }
}
