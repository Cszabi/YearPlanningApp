using Microsoft.EntityFrameworkCore;
using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Application.Onboarding;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Infrastructure.Persistence;

namespace YearPlanningApp.Application.Tests.Onboarding;

public class UpdateOnboardingStatusCommandHandlerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Infrastructure.Persistence.UnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;
    private readonly UpdateOnboardingStatusCommandHandler _handler;
    private readonly Guid _userId = Guid.NewGuid();

    public UpdateOnboardingStatusCommandHandlerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _uow = new Infrastructure.Persistence.UnitOfWork(_context);

        _currentUser = Substitute.For<ICurrentUserService>();
        _currentUser.UserId.Returns(_userId);

        _handler = new UpdateOnboardingStatusCommandHandler(_uow, _currentUser);
    }

    [Fact]
    public async Task Handle_ShouldUpdateOnboardingStatus_ForExistingUser()
    {
        var user = new User
        {
            Id = _userId, Email = "u@test.com", DisplayName = "U",
            OnboardingStatus = OnboardingStatus.NotStarted,
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        await _handler.Handle(
            new UpdateOnboardingStatusCommand(OnboardingStatus.InProgress), CancellationToken.None);

        var updated = await _context.Users.IgnoreQueryFilters().FirstAsync(u => u.Id == _userId);
        updated.OnboardingStatus.ShouldBe(OnboardingStatus.InProgress);
    }

    [Fact]
    public async Task Handle_ShouldReturnSuccessResult()
    {
        var user = new User { Id = _userId, Email = "u@test.com", DisplayName = "U" };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var result = await _handler.Handle(
            new UpdateOnboardingStatusCommand(OnboardingStatus.Skipped), CancellationToken.None);

        result.ShouldBeOfType<SuccessResult>();
    }

    [Fact]
    public async Task Handle_ShouldSetOnboardingCompletedAt_WhenStatusIsCompleted()
    {
        var before = DateTimeOffset.UtcNow.AddSeconds(-1);
        var user = new User
        {
            Id = _userId, Email = "u@test.com", DisplayName = "U",
            OnboardingStatus = OnboardingStatus.InProgress,
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        await _handler.Handle(
            new UpdateOnboardingStatusCommand(OnboardingStatus.Completed), CancellationToken.None);

        var updated = await _context.Users.IgnoreQueryFilters().FirstAsync(u => u.Id == _userId);
        updated.OnboardingStatus.ShouldBe(OnboardingStatus.Completed);
        updated.OnboardingCompletedAt.ShouldNotBeNull();
        updated.OnboardingCompletedAt!.Value.ShouldBeGreaterThan(before);
    }

    [Fact]
    public async Task Handle_ShouldNotSetCompletedAt_WhenStatusIsNotCompleted()
    {
        var user = new User
        {
            Id = _userId, Email = "u@test.com", DisplayName = "U",
            OnboardingStatus = OnboardingStatus.NotStarted,
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        await _handler.Handle(
            new UpdateOnboardingStatusCommand(OnboardingStatus.Skipped), CancellationToken.None);

        var updated = await _context.Users.IgnoreQueryFilters().FirstAsync(u => u.Id == _userId);
        updated.OnboardingCompletedAt.ShouldBeNull();
    }

    [Fact]
    public async Task Handle_ShouldNotSetCompletedAt_WhenStatusIsInProgress()
    {
        var user = new User { Id = _userId, Email = "u@test.com", DisplayName = "U" };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        await _handler.Handle(
            new UpdateOnboardingStatusCommand(OnboardingStatus.InProgress), CancellationToken.None);

        var updated = await _context.Users.IgnoreQueryFilters().FirstAsync(u => u.Id == _userId);
        updated.OnboardingCompletedAt.ShouldBeNull();
    }

    [Fact]
    public async Task Handle_ShouldBeNoOp_WhenUserNotFound()
    {
        // No user seeded — handler should silently succeed
        var result = await _handler.Handle(
            new UpdateOnboardingStatusCommand(OnboardingStatus.Completed), CancellationToken.None);

        result.ShouldBeOfType<SuccessResult>();
    }

    [Theory]
    [InlineData(OnboardingStatus.NotStarted)]
    [InlineData(OnboardingStatus.InProgress)]
    [InlineData(OnboardingStatus.Skipped)]
    [InlineData(OnboardingStatus.Completed)]
    public async Task Handle_ShouldPersistAllValidStatuses(OnboardingStatus status)
    {
        var user = new User { Id = _userId, Email = "u@test.com", DisplayName = "U" };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        await _handler.Handle(new UpdateOnboardingStatusCommand(status), CancellationToken.None);

        var updated = await _context.Users.IgnoreQueryFilters().FirstAsync(u => u.Id == _userId);
        updated.OnboardingStatus.ShouldBe(status);
    }

    public void Dispose()
    {
        _uow.Dispose();
        _context.Dispose();
    }
}
