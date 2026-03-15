using FluentValidation;
using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Ikigai;

public record SaveNorthStarCommand(int Year, string Statement)
    : ICommand<OneOf<NorthStarDto, ValidationError>>, IAuthenticatedCommand;

public class SaveNorthStarCommandValidator : AbstractValidator<SaveNorthStarCommand>
{
    public SaveNorthStarCommandValidator()
    {
        RuleFor(x => x.Year).InclusiveBetween(2020, 2100);
        RuleFor(x => x.Statement).NotEmpty().MaximumLength(1000);
    }
}

public class SaveNorthStarCommandHandler
    : ICommandHandler<SaveNorthStarCommand, OneOf<NorthStarDto, ValidationError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public SaveNorthStarCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<NorthStarDto, ValidationError>> Handle(
        SaveNorthStarCommand command, CancellationToken ct)
    {
        var northStar = new NorthStar
        {
            UserId = _currentUser.UserId,
            Year = command.Year,
            Statement = command.Statement
        };

        await _uow.Ikigai.UpsertNorthStarAsync(northStar, ct);
        await _uow.SaveChangesAsync(ct);

        // Reload to get the persisted Id
        var saved = await _uow.Ikigai.GetNorthStarAsync(_currentUser.UserId, command.Year, ct);
        return saved!.ToDto();
    }
}
