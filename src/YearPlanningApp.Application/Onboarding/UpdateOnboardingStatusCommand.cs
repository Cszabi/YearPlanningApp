using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Onboarding;

public record UpdateOnboardingStatusCommand(OnboardingStatus Status)
    : ICommand<SuccessResult>, IAuthenticatedCommand;

public class UpdateOnboardingStatusCommandHandler
    : ICommandHandler<UpdateOnboardingStatusCommand, SuccessResult>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public UpdateOnboardingStatusCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<SuccessResult> Handle(UpdateOnboardingStatusCommand command, CancellationToken ct)
    {
        var user = await _uow.Users.GetByIdAsync(_currentUser.UserId, ct);
        if (user is null) return new SuccessResult(); // no-op if user not found

        user.OnboardingStatus = command.Status;
        if (command.Status == OnboardingStatus.Completed)
            user.OnboardingCompletedAt = DateTimeOffset.UtcNow;

        _uow.Users.Update(user);
        await _uow.SaveChangesAsync(ct);
        return new SuccessResult();
    }
}
