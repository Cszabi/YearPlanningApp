using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Ikigai;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Ikigai;

public class SaveIkigaiRoomCommandHandlerTests
{
    private readonly IUnitOfWork _uow;
    private readonly IIkigaiRepository _ikigaiRepo;
    private readonly ICurrentUserService _currentUser;
    private readonly SaveIkigaiRoomCommandHandler _handler;

    private static readonly Guid UserId = Guid.NewGuid();

    public SaveIkigaiRoomCommandHandlerTests()
    {
        _uow = Substitute.For<IUnitOfWork>();
        _ikigaiRepo = Substitute.For<IIkigaiRepository>();
        _uow.Ikigai.Returns(_ikigaiRepo);

        _currentUser = Substitute.For<ICurrentUserService>();
        _currentUser.UserId.Returns(UserId);

        _handler = new SaveIkigaiRoomCommandHandler(_uow, _currentUser);
    }

    [Fact]
    public async Task Handle_ShouldReturnRoomDto_WhenJourneyExistsAndIsDraft()
    {
        var journey = new IkigaiJourney
        {
            Id = Guid.NewGuid(),
            UserId = UserId,
            Year = 2026,
            Status = IkigaiJourneyStatus.Draft,
            Rooms = new List<IkigaiRoom>()
        };
        _ikigaiRepo.GetJourneyByUserAndYearAsync(UserId, 2026, Arg.Any<CancellationToken>())
            .Returns(journey);

        var command = new SaveIkigaiRoomCommand(2026, IkigaiRoomType.Love, ["I love writing", "I love music"], false);

        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        var dto = result.AsT0;
        dto.RoomType.ShouldBe("Love");
        dto.Answers.ShouldBe(["I love writing", "I love music"]);
        dto.IsComplete.ShouldBeFalse();
    }

    [Fact]
    public async Task Handle_ShouldUpsertExistingRoom_WhenRoomAlreadyPresent()
    {
        var existingRoom = new IkigaiRoom
        {
            Id = Guid.NewGuid(),
            RoomType = IkigaiRoomType.Love,
            Answers = "[\"old answer\"]",
            IsComplete = false
        };
        var journey = new IkigaiJourney
        {
            Id = Guid.NewGuid(),
            UserId = UserId,
            Year = 2026,
            Status = IkigaiJourneyStatus.Draft,
            Rooms = new List<IkigaiRoom> { existingRoom }
        };
        existingRoom.JourneyId = journey.Id;
        _ikigaiRepo.GetJourneyByUserAndYearAsync(UserId, 2026, Arg.Any<CancellationToken>())
            .Returns(journey);

        var command = new SaveIkigaiRoomCommand(2026, IkigaiRoomType.Love, ["updated answer"], true);

        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.Answers.ShouldBe(["updated answer"]);
        result.AsT0.IsComplete.ShouldBeTrue();
        journey.Rooms.Count.ShouldBe(1); // no duplicate added
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFoundError_WhenJourneyDoesNotExist()
    {
        _ikigaiRepo.GetJourneyByUserAndYearAsync(UserId, 2026, Arg.Any<CancellationToken>())
            .Returns((IkigaiJourney?)null);

        var command = new SaveIkigaiRoomCommand(2026, IkigaiRoomType.Love, ["I love coding"], false);

        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnValidationError_WhenJourneyIsAlreadyComplete()
    {
        var journey = new IkigaiJourney
        {
            Id = Guid.NewGuid(),
            UserId = UserId,
            Year = 2026,
            Status = IkigaiJourneyStatus.Complete,
            Rooms = new List<IkigaiRoom>()
        };
        _ikigaiRepo.GetJourneyByUserAndYearAsync(UserId, 2026, Arg.Any<CancellationToken>())
            .Returns(journey);

        var command = new SaveIkigaiRoomCommand(2026, IkigaiRoomType.Love, ["I love coding"], false);

        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsT2.ShouldBeTrue();
        result.AsT2.Errors.ShouldHaveSingleItem();
        result.AsT2.Errors.First().PropertyName.ShouldBe("Status");
    }
}
