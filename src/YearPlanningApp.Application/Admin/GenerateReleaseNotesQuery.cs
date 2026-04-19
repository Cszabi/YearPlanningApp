using Mediator;
using YearPlanningApp.Application.Common.Interfaces;

namespace YearPlanningApp.Application.Admin;

public record GenerateReleaseNotesQuery(DateOnly SinceDate)
    : ICommand<string>;

public class GenerateReleaseNotesQueryHandler(IReleaseNotesService service)
    : ICommandHandler<GenerateReleaseNotesQuery, string>
{
    public async ValueTask<string> Handle(GenerateReleaseNotesQuery query, CancellationToken ct)
        => await service.GenerateHtmlAsync(query.SinceDate, ct);
}
