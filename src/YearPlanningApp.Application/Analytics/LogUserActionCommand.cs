using FluentValidation;
using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Analytics;

public record LogUserActionCommand(
    Guid PageSessionId,
    string Page,
    string ActionType,
    string? ActionLabel,
    string? Metadata
) : ICommand<OneOf<SuccessResult, ValidationError>>, IAuthenticatedCommand;

public class LogUserActionCommandValidator : AbstractValidator<LogUserActionCommand>
{
    public LogUserActionCommandValidator()
    {
        RuleFor(x => x.Page).NotEmpty().MaximumLength(100);
        RuleFor(x => x.ActionType).NotEmpty().MaximumLength(100);
        RuleFor(x => x.ActionLabel).MaximumLength(255).When(x => x.ActionLabel is not null);
        // PRIVACY: ActionLabel and Metadata must never contain user-entered free text.
        // Only structural labels are permitted: field names, enum values, IDs, counts.
    }
}

public class LogUserActionCommandHandler
    : ICommandHandler<LogUserActionCommand, OneOf<SuccessResult, ValidationError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;
    private readonly IAnalyticsBuffer _buffer;

    public LogUserActionCommandHandler(
        IUnitOfWork uow, ICurrentUserService currentUser, IAnalyticsBuffer buffer)
    {
        _uow = uow;
        _currentUser = currentUser;
        _buffer = buffer;
    }

    public async ValueTask<OneOf<SuccessResult, ValidationError>> Handle(
        LogUserActionCommand command, CancellationToken ct)
    {
        var action = new UserAction
        {
            UserId = _currentUser.UserId,
            PageSessionId = command.PageSessionId,
            Page = command.Page,
            ActionType = command.ActionType,
            ActionLabel = command.ActionLabel,
            OccurredAt = DateTimeOffset.UtcNow,
            Metadata = command.Metadata
        };

        if (_buffer.IsAvailable)
        {
            await _buffer.BufferActionAsync(action, ct);
        }
        else
        {
            // Redis unavailable — fall back to direct DB write
            await _uow.UserActions.AddAsync(action, ct);
            await _uow.SaveChangesAsync(ct);
        }

        return new SuccessResult();
    }
}
