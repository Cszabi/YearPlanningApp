namespace YearPlanningApp.Application.Common.Interfaces;

public record FocusTrackDto(
    string Id,
    string Name,
    string ArtistName,
    string AudioUrl,
    int DurationSeconds);

public interface IFocusMusicService
{
    Task<IReadOnlyList<FocusTrackDto>> GetTracksAsync(CancellationToken ct = default);
}
