using FluentValidation;
using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Analytics;

public record StartPageSessionCommand(
    string Page,
    string? DeviceType
) : ICommand<OneOf<PageSessionDto, ValidationError>>, IAuthenticatedCommand;

public class StartPageSessionCommandValidator : AbstractValidator<StartPageSessionCommand>
{
    public StartPageSessionCommandValidator()
    {
        RuleFor(x => x.Page).NotEmpty().MaximumLength(100);
    }
}

public class StartPageSessionCommandHandler
    : ICommandHandler<StartPageSessionCommand, OneOf<PageSessionDto, ValidationError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public StartPageSessionCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<PageSessionDto, ValidationError>> Handle(
        StartPageSessionCommand command, CancellationToken ct)
    {
        var session = new PageSession
        {
            UserId = _currentUser.UserId,
            Page = command.Page,
            SessionStart = DateTimeOffset.UtcNow,
            DeviceType = command.DeviceType,
            ExitType = PageExitType.Unknown
        };

        await _uow.PageSessions.AddAsync(session, ct);
        await _uow.SaveChangesAsync(ct);

        return session.ToDto(null);
    }
}
