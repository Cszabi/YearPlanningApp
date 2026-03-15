using Mediator;
using Microsoft.AspNetCore.Identity;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Auth;

public record DeleteAccountCommand(string PasswordConfirmation)
    : ICommand<OneOf<SuccessResult, UnauthorizedError>>, IAuthenticatedCommand;

public class DeleteAccountCommandHandler
    : ICommandHandler<DeleteAccountCommand, OneOf<SuccessResult, UnauthorizedError>>
{
    private readonly IUnitOfWork _uow;
    private readonly IPasswordHasher<User> _hasher;
    private readonly ICurrentUserService _currentUser;

    public DeleteAccountCommandHandler(
        IUnitOfWork uow,
        IPasswordHasher<User> hasher,
        ICurrentUserService currentUser)
    {
        _uow = uow;
        _hasher = hasher;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<SuccessResult, UnauthorizedError>> Handle(
        DeleteAccountCommand command, CancellationToken ct)
    {
        var user = await _uow.Users.GetByIdAsync(_currentUser.UserId, ct);
        if (user is null)
            return new UnauthorizedError("Account not found.");

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, command.PasswordConfirmation);
        if (result == PasswordVerificationResult.Failed)
            return new UnauthorizedError("Incorrect password.");

        try
        {
            await _uow.BeginTransactionAsync(ct);
            await _uow.PermanentlyDeleteUserAsync(_currentUser.UserId, ct);
            await _uow.CommitTransactionAsync(ct);
        }
        catch
        {
            await _uow.RollbackTransactionAsync(ct);
            throw;
        }

        return new SuccessResult();
    }
}
