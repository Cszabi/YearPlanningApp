using FluentValidation;
using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Notifications;

public record SubscribePushCommand(
    string Endpoint,
    string P256dh,
    string Auth,
    string? UserAgent)
    : ICommand<OneOf<SuccessResult, ValidationError>>, IAuthenticatedCommand;

public class SubscribePushCommandValidator : AbstractValidator<SubscribePushCommand>
{
    public SubscribePushCommandValidator()
    {
        RuleFor(x => x.Endpoint).NotEmpty().MaximumLength(2048);
        RuleFor(x => x.P256dh).NotEmpty();
        RuleFor(x => x.Auth).NotEmpty();
    }
}

public class SubscribePushCommandHandler
    : ICommandHandler<SubscribePushCommand, OneOf<SuccessResult, ValidationError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public SubscribePushCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<SuccessResult, ValidationError>> Handle(
        SubscribePushCommand command, CancellationToken ct)
    {
        var userId = _currentUser.UserId;
        var subscription = new PushSubscription
        {
            UserId = userId,
            Endpoint = command.Endpoint,
            P256dh = command.P256dh,
            Auth = command.Auth,
            UserAgent = command.UserAgent,
            IsActive = true,
        };

        await _uow.PushSubscriptions.UpsertAsync(subscription, ct);
        await _uow.SaveChangesAsync(ct);
        return new SuccessResult();
    }
}
