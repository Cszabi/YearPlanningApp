using OneOf;
using YearPlanningApp.Application.Common.Models;

namespace YearPlanningApp.Application.Ikigai;

public record IkigaiThemeCategory(string Label, List<string> Themes);
public record IkigaiExtractionResult(List<IkigaiThemeCategory> Categories);
public record ExtractionError(string Message);

public interface IIkigaiThemeExtractionService
{
    Task<OneOf<IkigaiExtractionResult, ExtractionError>> ExtractThemesAsync(
        IkigaiJourneyDto journey, CancellationToken ct = default);
}
