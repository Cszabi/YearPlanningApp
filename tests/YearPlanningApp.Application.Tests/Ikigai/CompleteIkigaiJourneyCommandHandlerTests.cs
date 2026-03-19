using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Ikigai;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Ikigai;

public class CompleteIkigaiJourneyCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly CompleteIkigaiJourneyCommandHandler _handler;

    public CompleteIkigaiJourneyCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new CompleteIkigaiJourneyCommandHandler(_uow, _currentUser);
    }

    private IkigaiJourney BuildJourneyWithAllRoomsComplete() => new()
    {
        Id = Guid.NewGuid(), UserId = _userId, Year = 2026,
        Status = IkigaiJourneyStatus.Draft,
        Values = new List<UserValue>(),
        Rooms = Enum.GetValues<IkigaiRoomType>().Select(rt => new IkigaiRoom
        {
            Id = Guid.NewGuid(), RoomType = rt, IsComplete = true, Answers = "[]"
        }).ToList()
    };

    [Fact]
    public async Task Handle_ShouldCompleteJourney_WhenAllRoomsAreComplete()
    {
        var journey = BuildJourneyWithAllRoomsComplete();
        _uow.Ikigai.GetJourneyByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns(journey);

        var result = await _handler.Handle(new CompleteIkigaiJourneyCommand(2026), CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Status.ShouldBe(IkigaiJourneyStatus.Complete.ToString());
    }

    [Fact]
    public async Task Handle_ShouldReturnValidationError_WhenSomeRoomsAreIncomplete()
    {
        var journey = new IkigaiJourney
        {
            Id = Guid.NewGuid(), UserId = _userId, Year = 2026,
            Status = IkigaiJourneyStatus.Draft,
            Values = new List<UserValue>(),
            Rooms = new List<IkigaiRoom>
            {
                new() { RoomType = IkigaiRoomType.Love, IsComplete = true, Answers = "[]" }
                // Other rooms are missing / incomplete
            }
        };
        _uow.Ikigai.GetJourneyByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns(journey);

        var result = await _handler.Handle(new CompleteIkigaiJourneyCommand(2026), CancellationToken.None);

        result.IsT2.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenJourneyDoesNotExist()
    {
        _uow.Ikigai.GetJourneyByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns((IkigaiJourney?)null);

        var result = await _handler.Handle(new CompleteIkigaiJourneyCommand(2026), CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnValidationError_WhenJourneyAlreadyComplete()
    {
        var journey = BuildJourneyWithAllRoomsComplete();
        journey.Status = IkigaiJourneyStatus.Complete;
        _uow.Ikigai.GetJourneyByUserAndYearAsync(_userId, 2026, Arg.Any<CancellationToken>())
            .Returns(journey);

        var result = await _handler.Handle(new CompleteIkigaiJourneyCommand(2026), CancellationToken.None);

        result.IsT2.ShouldBeTrue();
    }
}
