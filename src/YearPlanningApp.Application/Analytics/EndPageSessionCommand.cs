using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Analytics;

public record EndPageSessionCommand(
    Guid SessionId,
    PageExitType ExitType
) : ICommand<OneOf<PageSessionDto, NotFoundError>>, IAuthenticatedCommand;

public class EndPageSessionCommandHandler
    : ICommandHandler<EndPageSessionCommand, OneOf<PageSessionDto, NotFoundError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public EndPageSessionCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<PageSessionDto, NotFoundError>> Handle(
        EndPageSessionCommand command, CancellationToken ct)
    {
        var session = await _uow.PageSessions.GetByIdAsync(command.SessionId, ct);

        if (session is null || session.UserId != _currentUser.UserId)
            return new NotFoundError("PageSession", command.SessionId);

        var now = DateTimeOffset.UtcNow;
        session.SessionEnd = now;
        session.ExitType = command.ExitType;

        var rawDuration = (int)(now - session.SessionStart).TotalSeconds;
        session.DurationSeconds = rawDuration < 0 ? 0 : rawDuration;

        _uow.PageSessions.Update(session);
        await _uow.SaveChangesAsync(ct);

        return session.ToDto(null);
    }
}
