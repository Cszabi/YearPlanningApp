namespace YearPlanningApp.Application.Common.Interfaces;

public interface IReleaseNotesService
{
    Task<string> GenerateHtmlAsync(DateOnly sinceDate, CancellationToken ct = default);
}
