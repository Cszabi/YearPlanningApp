using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Admin;

public record GetUserDetailQuery(Guid UserId)
    : IQuery<OneOf<UserDetailDto, NotFoundError, UnauthorizedError>>, IAuthenticatedCommand;

public class GetUserDetailQueryHandler
    : IQueryHandler<GetUserDetailQuery, OneOf<UserDetailDto, NotFoundError, UnauthorizedError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetUserDetailQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<UserDetailDto, NotFoundError, UnauthorizedError>> Handle(
        GetUserDetailQuery query, CancellationToken ct)
    {
        if (!_currentUser.IsAdmin)
            return new UnauthorizedError("Admin access required.");

        var user = await _uow.Users.GetWithDetailsAsync(query.UserId, ct);
        if (user is null)
            return new NotFoundError("User", query.UserId);

        var goalTitles = user.Goals
            .OrderBy(g => g.CreatedAt)
            .Select(g => g.Title)
            .ToList()
            .AsReadOnly();

        var recentSessions = user.FlowSessions
            .OrderByDescending(s => s.StartedAt)
            .Take(10)
            .Select(s => s.StartedAt)
            .ToList()
            .AsReadOnly();

        return new UserDetailDto(
            user.Id,
            user.Email,
            user.DisplayName,
            user.Role.ToString(),
            user.Plan.ToString(),
            user.CreatedAt,
            user.Goals.Count,
            user.FlowSessions.Count,
            goalTitles,
            recentSessions);
    }
}
