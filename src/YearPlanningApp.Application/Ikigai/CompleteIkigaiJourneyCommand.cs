using FluentValidation.Results;
using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Ikigai;

public record CompleteIkigaiJourneyCommand(int Year)
    : ICommand<OneOf<IkigaiJourneyDto, NotFoundError, ValidationError>>, IAuthenticatedCommand;

public class CompleteIkigaiJourneyCommandHandler
    : ICommandHandler<CompleteIkigaiJourneyCommand, OneOf<IkigaiJourneyDto, NotFoundError, ValidationError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public CompleteIkigaiJourneyCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<IkigaiJourneyDto, NotFoundError, ValidationError>> Handle(
        CompleteIkigaiJourneyCommand command, CancellationToken ct)
    {
        var journey = await _uow.Ikigai.GetJourneyByUserAndYearAsync(_currentUser.UserId, command.Year, ct);
        if (journey is null)
            return new NotFoundError("IkigaiJourney", Guid.Empty);

        if (journey.Status == IkigaiJourneyStatus.Complete)
            return new ValidationError([new ValidationFailure("Status", "Journey is already complete.")]);

        var completedRooms = journey.Rooms.Where(r => r.IsComplete).Select(r => r.RoomType).ToHashSet();
        var allRoomTypes = Enum.GetValues<IkigaiRoomType>();
        var incompleteRooms = allRoomTypes.Where(t => !completedRooms.Contains(t)).ToList();

        if (incompleteRooms.Count > 0)
        {
            var missing = string.Join(", ", incompleteRooms);
            return new ValidationError([new ValidationFailure("Rooms", $"The following rooms are not complete: {missing}.")]);
        }

        journey.Status = IkigaiJourneyStatus.Complete;
        journey.CompletedAt = DateTime.UtcNow;
        journey.UpdatedAt = DateTime.UtcNow;

        _uow.Ikigai.Update(journey);
        await _uow.SaveChangesAsync(ct);

        return journey.ToDto();
    }
}
