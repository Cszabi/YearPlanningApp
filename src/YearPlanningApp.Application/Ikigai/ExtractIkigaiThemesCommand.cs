using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Ikigai;

public record ExtractIkigaiThemesCommand(int Year)
    : ICommand<OneOf<IkigaiExtractionResult, NotFoundError, ExtractionError>>, IAuthenticatedCommand;

public class ExtractIkigaiThemesCommandHandler
    : ICommandHandler<ExtractIkigaiThemesCommand, OneOf<IkigaiExtractionResult, NotFoundError, ExtractionError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;
    private readonly IIkigaiThemeExtractionService _extractionService;

    public ExtractIkigaiThemesCommandHandler(
        IUnitOfWork uow,
        ICurrentUserService currentUser,
        IIkigaiThemeExtractionService extractionService)
    {
        _uow = uow;
        _currentUser = currentUser;
        _extractionService = extractionService;
    }

    public async ValueTask<OneOf<IkigaiExtractionResult, NotFoundError, ExtractionError>> Handle(
        ExtractIkigaiThemesCommand command, CancellationToken ct)
    {
        var journey = await _uow.Ikigai.GetJourneyByUserAndYearAsync(_currentUser.UserId, command.Year, ct);
        if (journey is null)
            return new NotFoundError("IkigaiJourney", Guid.Empty);

        var result = await _extractionService.ExtractThemesAsync(journey.ToDto(), ct);
        return result.Match<OneOf<IkigaiExtractionResult, NotFoundError, ExtractionError>>(
            extraction => extraction,
            error => error);
    }
}
