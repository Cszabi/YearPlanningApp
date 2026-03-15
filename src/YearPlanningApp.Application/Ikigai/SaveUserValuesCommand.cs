using FluentValidation;
using FluentValidation.Results;
using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Ikigai;

public record SaveValueItem(string ValueName, int Rank);

public record SaveUserValuesCommand(int Year, List<SaveValueItem> Values)
    : ICommand<OneOf<List<UserValueDto>, ValidationError>>, IAuthenticatedCommand;

public class SaveUserValuesCommandValidator : AbstractValidator<SaveUserValuesCommand>
{
    public SaveUserValuesCommandValidator()
    {
        RuleFor(x => x.Year).InclusiveBetween(2020, 2100);
        RuleFor(x => x.Values).NotNull().Must(v => v.Count == 5)
            .WithMessage("Exactly 5 values must be provided.");
        RuleForEach(x => x.Values).ChildRules(v =>
        {
            v.RuleFor(x => x.ValueName).NotEmpty().MaximumLength(100);
            v.RuleFor(x => x.Rank).InclusiveBetween(1, 5);
        });
    }
}

public class SaveUserValuesCommandHandler
    : ICommandHandler<SaveUserValuesCommand, OneOf<List<UserValueDto>, ValidationError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public SaveUserValuesCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<List<UserValueDto>, ValidationError>> Handle(
        SaveUserValuesCommand command, CancellationToken ct)
    {
        var ranks = command.Values.Select(v => v.Rank).OrderBy(r => r).ToList();
        var expectedRanks = Enumerable.Range(1, 5).ToList();
        if (!ranks.SequenceEqual(expectedRanks))
            return new ValidationError([new ValidationFailure("Values", "Ranks must be unique integers from 1 to 5.")]);

        var values = command.Values.Select(v => new UserValue
        {
            UserId = _currentUser.UserId,
            Year = command.Year,
            ValueName = v.ValueName,
            Rank = v.Rank
        }).ToList();

        await _uow.Ikigai.UpsertUserValuesAsync(_currentUser.UserId, command.Year, values, ct);
        await _uow.SaveChangesAsync(ct);

        return values.Select(v => v.ToDto()).ToList();
    }
}
