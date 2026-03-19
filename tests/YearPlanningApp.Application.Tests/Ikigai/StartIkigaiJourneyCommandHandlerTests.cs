using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Ikigai;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Ikigai;

public class StartIkigaiJourneyCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly StartIkigaiJourneyCommandHandler _handler;

    public StartIkigaiJourneyCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new StartIkigaiJourneyCommandHandler(_uow, _currentUser);
    }

    [Fact]
    public async Task Handle_ShouldCreateJourney_WhenNoneExistsForYear()
    {
        _uow.Ikigai.GetJourneyByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns((IkigaiJourney?)null);
        IkigaiJourney? saved = null;
        await _uow.Ikigai.AddAsync(Arg.Do<IkigaiJourney>(j => saved = j), Arg.Any<CancellationToken>());

        var result = await _handler.Handle(new StartIkigaiJourneyCommand(2026), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Year.ShouldBe(2026);
        result.AsT0.Status.ShouldBe(IkigaiJourneyStatus.Draft.ToString());
        saved.ShouldNotBeNull();
    }

    [Fact]
    public async Task Handle_ShouldReturnConflictError_WhenJourneyAlreadyExists()
    {
        var existing = new IkigaiJourney
        {
            Id = Guid.NewGuid(), UserId = _userId, Year = 2026,
            Status = IkigaiJourneyStatus.Draft, Rooms = new List<IkigaiRoom>(),
            Values = new List<UserValue>()
        };
        _uow.Ikigai.GetJourneyByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns(existing);

        var result = await _handler.Handle(new StartIkigaiJourneyCommand(2026), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
        await _uow.Ikigai.DidNotReceive().AddAsync(Arg.Any<IkigaiJourney>(), Arg.Any<CancellationToken>());
    }
}
