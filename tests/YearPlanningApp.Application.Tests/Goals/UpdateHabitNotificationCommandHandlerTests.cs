using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Goals;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Goals;

// ── Handler unit tests ─────────────────────────────────────────────────────────

public class UpdateHabitNotificationCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly IHabitRepository _habitRepo = Substitute.For<IHabitRepository>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly UpdateHabitNotificationCommandHandler _handler;

    public UpdateHabitNotificationCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _uow.Habits.Returns(_habitRepo);
        _handler = new UpdateHabitNotificationCommandHandler(_uow, _currentUser);
    }

    private Habit BuildHabit(bool notificationEnabled = false, int? reminderHour = null, int? reminderMinute = null) => new()
    {
        Id = Guid.NewGuid(),
        UserId = _userId,
        GoalId = Guid.NewGuid(),
        Title = "Morning run",
        Frequency = HabitFrequency.Daily,
        MinimumViableDose = "10 minutes",
        TrackingMethod = HabitTrackingMethod.Streak,
        NotificationEnabled = notificationEnabled,
        ReminderHour = reminderHour,
        ReminderMinute = reminderMinute,
        Logs = new List<HabitLog>(),
    };

    [Fact]
    public async Task Handle_ShouldEnableNotification_AndSetReminderTime()
    {
        var habit = BuildHabit();
        _habitRepo.GetByIdAsync(habit.Id, Arg.Any<CancellationToken>()).Returns(habit);

        var result = await _handler.Handle(
            new UpdateHabitNotificationCommand(habit.Id, true, 9, 30),
            CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.NotificationEnabled.ShouldBeTrue();
        result.AsT0.ReminderHour.ShouldBe(9);
        result.AsT0.ReminderMinute.ShouldBe(30);
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldDisableNotification_AndClearReminderTime()
    {
        var habit = BuildHabit(notificationEnabled: true, reminderHour: 7, reminderMinute: 45);
        _habitRepo.GetByIdAsync(habit.Id, Arg.Any<CancellationToken>()).Returns(habit);

        var result = await _handler.Handle(
            new UpdateHabitNotificationCommand(habit.Id, false, null, null),
            CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.NotificationEnabled.ShouldBeFalse();
        result.AsT0.ReminderHour.ShouldBeNull();
        result.AsT0.ReminderMinute.ShouldBeNull();
    }

    [Fact]
    public async Task Handle_ShouldClearReminderTime_WhenDisabledEvenIfTimeProvided()
    {
        var habit = BuildHabit(notificationEnabled: true, reminderHour: 7, reminderMinute: 30);
        _habitRepo.GetByIdAsync(habit.Id, Arg.Any<CancellationToken>()).Returns(habit);

        var result = await _handler.Handle(
            new UpdateHabitNotificationCommand(habit.Id, false, 7, 30),
            CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.ReminderHour.ShouldBeNull();
        result.AsT0.ReminderMinute.ShouldBeNull();
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFound_WhenHabitDoesNotExist()
    {
        _habitRepo.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Habit?)null);

        var result = await _handler.Handle(
            new UpdateHabitNotificationCommand(Guid.NewGuid(), true, 8, 0),
            CancellationToken.None);

        result.IsT2.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldReturnNotFound_WhenHabitBelongsToDifferentUser()
    {
        var habit = BuildHabit();
        habit.UserId = Guid.NewGuid();
        _habitRepo.GetByIdAsync(habit.Id, Arg.Any<CancellationToken>()).Returns(habit);

        var result = await _handler.Handle(
            new UpdateHabitNotificationCommand(habit.Id, true, 8, 0),
            CancellationToken.None);

        result.IsT2.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_ShouldCallUpdate_OnHabitRepository()
    {
        var habit = BuildHabit();
        _habitRepo.GetByIdAsync(habit.Id, Arg.Any<CancellationToken>()).Returns(habit);

        await _handler.Handle(
            new UpdateHabitNotificationCommand(habit.Id, true, 18, 15),
            CancellationToken.None);

        _habitRepo.Received(1).Update(habit);
    }
}

// ── Validator unit tests ───────────────────────────────────────────────────────

public class UpdateHabitNotificationCommandValidatorTests
{
    private readonly UpdateHabitNotificationCommandValidator _validator = new();

    [Fact]
    public void Validate_Fails_WhenEnabledAndReminderHourIsNull()
    {
        var cmd = new UpdateHabitNotificationCommand(Guid.NewGuid(), true, null, 0);
        var result = _validator.Validate(cmd);
        result.IsValid.ShouldBeFalse();
        result.Errors.ShouldContain(e => e.PropertyName == nameof(cmd.ReminderHour));
    }

    [Fact]
    public void Validate_Fails_WhenEnabledAndReminderMinuteIsNull()
    {
        var cmd = new UpdateHabitNotificationCommand(Guid.NewGuid(), true, 8, null);
        var result = _validator.Validate(cmd);
        result.IsValid.ShouldBeFalse();
        result.Errors.ShouldContain(e => e.PropertyName == nameof(cmd.ReminderMinute));
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(24)]
    [InlineData(100)]
    public void Validate_Fails_WhenEnabledAndReminderHourOutOfRange(int hour)
    {
        var cmd = new UpdateHabitNotificationCommand(Guid.NewGuid(), true, hour, 0);
        var result = _validator.Validate(cmd);
        result.IsValid.ShouldBeFalse();
        result.Errors.ShouldContain(e => e.PropertyName == nameof(cmd.ReminderHour));
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(60)]
    public void Validate_Fails_WhenEnabledAndReminderMinuteOutOfRange(int minute)
    {
        var cmd = new UpdateHabitNotificationCommand(Guid.NewGuid(), true, 8, minute);
        var result = _validator.Validate(cmd);
        result.IsValid.ShouldBeFalse();
        result.Errors.ShouldContain(e => e.PropertyName == nameof(cmd.ReminderMinute));
    }

    [Theory]
    [InlineData(0, 0)]
    [InlineData(8, 30)]
    [InlineData(23, 59)]
    public void Validate_Passes_WhenEnabledAndTimeIsValid(int hour, int minute)
    {
        var cmd = new UpdateHabitNotificationCommand(Guid.NewGuid(), true, hour, minute);
        _validator.Validate(cmd).IsValid.ShouldBeTrue();
    }

    [Fact]
    public void Validate_Passes_WhenDisabledWithNoTime()
    {
        var cmd = new UpdateHabitNotificationCommand(Guid.NewGuid(), false, null, null);
        _validator.Validate(cmd).IsValid.ShouldBeTrue();
    }

    [Fact]
    public void Validate_Passes_WhenDisabledEvenWithOutOfRangeValues()
    {
        var cmd = new UpdateHabitNotificationCommand(Guid.NewGuid(), false, 99, 99);
        _validator.Validate(cmd).IsValid.ShouldBeTrue();
    }
}
