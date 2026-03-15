using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Ikigai;

public record StartIkigaiJourneyCommand(int Year)
    : ICommand<OneOf<IkigaiJourneyDto, ConflictError>>, IAuthenticatedCommand;

public class StartIkigaiJourneyCommandHandler
    : ICommandHandler<StartIkigaiJourneyCommand, OneOf<IkigaiJourneyDto, ConflictError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public StartIkigaiJourneyCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<IkigaiJourneyDto, ConflictError>> Handle(
        StartIkigaiJourneyCommand command, CancellationToken ct)
    {
        var existing = await _uow.Ikigai.GetJourneyByUserAndYearAsync(_currentUser.UserId, command.Year, ct);
        if (existing is not null)
            return new ConflictError($"An Ikigai journey for {command.Year} already exists.");

        var journey = new IkigaiJourney
        {
            UserId = _currentUser.UserId,
            Year = command.Year,
            Status = IkigaiJourneyStatus.Draft
        };

        await _uow.Ikigai.AddAsync(journey, ct);
        await _uow.SaveChangesAsync(ct);

        return journey.ToDto();
    }
}
