using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.MindMap;

public record GetMindMapQuery(int Year)
    : IQuery<OneOf<MindMapDto, NotFoundError>>, IAuthenticatedCommand;

public class GetMindMapQueryHandler
    : IQueryHandler<GetMindMapQuery, OneOf<MindMapDto, NotFoundError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetMindMapQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<MindMapDto, NotFoundError>> Handle(
        GetMindMapQuery query, CancellationToken ct)
    {
        var mindMap = await _uow.MindMaps.GetByUserAndYearAsync(_currentUser.UserId, query.Year, ct);
        if (mindMap is null)
            return new NotFoundError("MindMap", Guid.Empty);

        return mindMap.ToDto();
    }
}
