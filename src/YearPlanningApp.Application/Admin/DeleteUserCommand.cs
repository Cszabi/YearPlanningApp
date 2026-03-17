using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Admin;

public record DeleteUserCommand(Guid TargetUserId)
    : ICommand<OneOf<SuccessResult, NotFoundError, UnauthorizedError>>, IAuthenticatedCommand;

public class DeleteUserCommandHandler
    : ICommandHandler<DeleteUserCommand, OneOf<SuccessResult, NotFoundError, UnauthorizedError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public DeleteUserCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<SuccessResult, NotFoundError, UnauthorizedError>> Handle(
        DeleteUserCommand command, CancellationToken ct)
    {
        if (!_currentUser.IsAdmin)
            return new UnauthorizedError("Admin access required.");

        if (command.TargetUserId == _currentUser.UserId)
            return new UnauthorizedError("Cannot delete your own admin account.");

        var user = await _uow.Users.GetByIdAsync(command.TargetUserId, ct);
        if (user is null)
            return new NotFoundError("User", command.TargetUserId);

        _uow.Users.Remove(user);
        await _uow.SaveChangesAsync(ct);

        return new SuccessResult();
    }
}
