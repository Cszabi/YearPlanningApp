using System.Text.Json;
using YearPlanningApp.Domain.Entities;

namespace YearPlanningApp.Application.Ikigai;

public record IkigaiJourneyDto(
    Guid Id,
    int Year,
    string Status,
    DateTime? CompletedAt,
    List<IkigaiRoomDto> Rooms,
    NorthStarDto? NorthStar,
    List<UserValueDto> Values);

public record IkigaiRoomDto(
    Guid Id,
    string RoomType,
    List<string> Answers,
    bool IsComplete);

public record NorthStarDto(
    Guid Id,
    string Statement,
    int Year);

public record UserValueDto(
    Guid Id,
    string ValueName,
    int Rank);

public static class IkigaiMappings
{
    public static IkigaiJourneyDto ToDto(this IkigaiJourney j) => new(
        j.Id,
        j.Year,
        j.Status.ToString(),
        j.CompletedAt,
        j.Rooms.Select(r => r.ToDto()).ToList(),
        j.NorthStar?.ToDto(),
        j.Values.OrderBy(v => v.Rank).Select(v => v.ToDto()).ToList());

    public static IkigaiRoomDto ToDto(this IkigaiRoom r) => new(
        r.Id,
        r.RoomType.ToString(),
        JsonSerializer.Deserialize<List<string>>(r.Answers) ?? [],
        r.IsComplete);

    public static NorthStarDto ToDto(this NorthStar n) => new(
        n.Id,
        n.Statement,
        n.Year);

    public static UserValueDto ToDto(this UserValue v) => new(
        v.Id,
        v.ValueName,
        v.Rank);
}
