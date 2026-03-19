using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Ikigai;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Ikigai;

public class GetIkigaiJourneyQueryHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly GetIkigaiJourneyQueryHandler _handler;

    public GetIkigaiJourneyQueryHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new GetIkigaiJourneyQueryHandler(_uow, _currentUser);
    }

    [Fact]
    public async Task Handle_ShouldReturnJourney_WhenItExists()
    {
        var journey = new IkigaiJourney
        {
            Id = Guid.NewGuid(), UserId = _userId, Year = 2026,
            Status = IkigaiJourneyStatus.Draft,
            Rooms = new List<IkigaiRoom>(), Values = new List<UserValue>()
        };
        _uow.Ikigai.GetJourneyByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>()).Returns(journey);

        var result = await _handler.Handle(new GetIkigaiJourneyQuery(2026), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Year.ShouldBe(2026);
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenJourneyDoesNotExist()
    {
        _uow.Ikigai.GetJourneyByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns((IkigaiJourney?)null);

        var result = await _handler.Handle(new GetIkigaiJourneyQuery(2026), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }
}
