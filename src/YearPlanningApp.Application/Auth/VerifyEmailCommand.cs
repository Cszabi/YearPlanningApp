using System.Security.Cryptography;
using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Auth;

public record VerifyEmailCommand(string Token) : ICommand<OneOf<SuccessResult, NotFoundError>>;

public class VerifyEmailCommandHandler
    : ICommandHandler<VerifyEmailCommand, OneOf<SuccessResult, NotFoundError>>
{
    private readonly IUnitOfWork _uow;

    public VerifyEmailCommandHandler(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async ValueTask<OneOf<SuccessResult, NotFoundError>> Handle(
        VerifyEmailCommand command, CancellationToken ct)
    {
        var tokenHash = Convert.ToHexString(
            SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(command.Token))
        ).ToLowerInvariant();

        var user = await _uow.Users.GetByEmailVerificationTokenHashAsync(tokenHash, ct);
        if (user is null)
            return new NotFoundError("EmailVerificationToken", Guid.Empty);

        if (user.EmailVerificationTokenExpiresAt < DateTime.UtcNow)
            return new NotFoundError("EmailVerificationToken", Guid.Empty); // treat expired as not found

        user.IsEmailVerified = true;
        user.EmailVerificationTokenHash = null;
        user.EmailVerificationTokenExpiresAt = null;

        _uow.Users.Update(user);
        await _uow.SaveChangesAsync(ct);

        return new SuccessResult();
    }
}
