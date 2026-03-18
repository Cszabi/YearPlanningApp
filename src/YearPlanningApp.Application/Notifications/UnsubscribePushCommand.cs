using FluentValidation;
using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Notifications;

public record UnsubscribePushCommand(string Endpoint)
    : ICommand<OneOf<SuccessResult, ValidationError>>, IAuthenticatedCommand;

public class UnsubscribePushCommandValidator : AbstractValidator<UnsubscribePushCommand>
{
    public UnsubscribePushCommandValidator()
    {
        RuleFor(x => x.Endpoint).NotEmpty();
    }
}

public class UnsubscribePushCommandHandler
    : ICommandHandler<UnsubscribePushCommand, OneOf<SuccessResult, ValidationError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public UnsubscribePushCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<SuccessResult, ValidationError>> Handle(
        UnsubscribePushCommand command, CancellationToken ct)
    {
        await _uow.PushSubscriptions.DeactivateAsync(command.Endpoint, ct);
        await _uow.SaveChangesAsync(ct);
        return new SuccessResult();
    }
}
