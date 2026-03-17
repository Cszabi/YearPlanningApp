using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Admin;

public record GetUsersQuery : IQuery<OneOf<IReadOnlyList<UserSummaryDto>, UnauthorizedError>>, IAuthenticatedCommand;

public class GetUsersQueryHandler
    : IQueryHandler<GetUsersQuery, OneOf<IReadOnlyList<UserSummaryDto>, UnauthorizedError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetUsersQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<IReadOnlyList<UserSummaryDto>, UnauthorizedError>> Handle(
        GetUsersQuery query, CancellationToken ct)
    {
        if (!_currentUser.IsAdmin)
            return new UnauthorizedError("Admin access required.");

        var users = await _uow.Users.GetAllWithCountsAsync(ct);

        var result = users
            .Select(u => new UserSummaryDto(
                u.Id,
                u.Email,
                u.DisplayName,
                u.Role.ToString(),
                u.Plan.ToString(),
                u.CreatedAt,
                u.Goals.Count,
                u.FlowSessions.Count))
            .ToList()
            .AsReadOnly();

        return result;
    }
}
