using FluentValidation;
using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Admin;

public record UpdateUserPlanCommand(Guid TargetUserId, string Plan)
    : ICommand<OneOf<UserSummaryDto, NotFoundError, UnauthorizedError, ValidationError>>, IAuthenticatedCommand;

public class UpdateUserPlanCommandValidator : AbstractValidator<UpdateUserPlanCommand>
{
    public UpdateUserPlanCommandValidator()
    {
        RuleFor(x => x.Plan).NotEmpty().Must(p => p == "Free" || p == "Pro")
            .WithMessage("Plan must be 'Free' or 'Pro'.");
    }
}

public class UpdateUserPlanCommandHandler
    : ICommandHandler<UpdateUserPlanCommand, OneOf<UserSummaryDto, NotFoundError, UnauthorizedError, ValidationError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public UpdateUserPlanCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<UserSummaryDto, NotFoundError, UnauthorizedError, ValidationError>> Handle(
        UpdateUserPlanCommand command, CancellationToken ct)
    {
        if (!_currentUser.IsAdmin)
            return new UnauthorizedError("Admin access required.");

        var user = await _uow.Users.GetWithDetailsAsync(command.TargetUserId, ct);
        if (user is null)
            return new NotFoundError("User", command.TargetUserId);

        user.Plan = Enum.Parse<UserPlan>(command.Plan);
        _uow.Users.Update(user);
        await _uow.SaveChangesAsync(ct);

        return new UserSummaryDto(
            user.Id,
            user.Email,
            user.DisplayName,
            user.Role.ToString(),
            user.Plan.ToString(),
            user.CreatedAt,
            user.Goals.Count,
            user.FlowSessions.Count);
    }
}
