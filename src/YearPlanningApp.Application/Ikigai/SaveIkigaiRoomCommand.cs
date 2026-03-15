using System.Text.Json;
using FluentValidation;
using FluentValidation.Results;
using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Ikigai;

public record SaveIkigaiRoomCommand(int Year, IkigaiRoomType RoomType, List<string> Answers, bool IsComplete)
    : ICommand<OneOf<IkigaiRoomDto, NotFoundError, ValidationError>>, IAuthenticatedCommand;

public class SaveIkigaiRoomCommandValidator : AbstractValidator<SaveIkigaiRoomCommand>
{
    public SaveIkigaiRoomCommandValidator()
    {
        RuleFor(x => x.Year).InclusiveBetween(2020, 2100);
        RuleFor(x => x.Answers).NotNull();
        RuleForEach(x => x.Answers).NotEmpty().MaximumLength(5000);
    }
}

public class SaveIkigaiRoomCommandHandler
    : ICommandHandler<SaveIkigaiRoomCommand, OneOf<IkigaiRoomDto, NotFoundError, ValidationError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public SaveIkigaiRoomCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<IkigaiRoomDto, NotFoundError, ValidationError>> Handle(
        SaveIkigaiRoomCommand command, CancellationToken ct)
    {
        var journey = await _uow.Ikigai.GetJourneyByUserAndYearAsync(_currentUser.UserId, command.Year, ct);
        if (journey is null)
            return new NotFoundError("IkigaiJourney", Guid.Empty);

        if (journey.Status == IkigaiJourneyStatus.Complete)
            return new ValidationError([new ValidationFailure("Status", "Journey is already complete and cannot be modified.")]);

        var room = journey.Rooms.FirstOrDefault(r => r.RoomType == command.RoomType);
        if (room is null)
        {
            room = new IkigaiRoom
            {
                JourneyId = journey.Id,
                RoomType = command.RoomType
            };
            journey.Rooms.Add(room);
        }

        room.Answers = JsonSerializer.Serialize(command.Answers);
        room.IsComplete = command.IsComplete;
        room.UpdatedAt = DateTime.UtcNow;

        await _uow.SaveChangesAsync(ct);

        return room.ToDto();
    }
}
