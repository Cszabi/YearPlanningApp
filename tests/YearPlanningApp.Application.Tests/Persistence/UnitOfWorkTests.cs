using Microsoft.EntityFrameworkCore;
using Shouldly;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Infrastructure.Persistence;

namespace YearPlanningApp.Application.Tests.Persistence;

public class UnitOfWorkTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly UnitOfWork _uow;

    public UnitOfWorkTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _uow = new UnitOfWork(_context);
    }

    [Fact]
    public void UnitOfWork_ShouldExposeAllRepositories()
    {
        _uow.Ikigai.ShouldNotBeNull();
        _uow.MindMaps.ShouldNotBeNull();
        _uow.Goals.ShouldNotBeNull();
        _uow.Tasks.ShouldNotBeNull();
        _uow.Habits.ShouldNotBeNull();
        _uow.FlowSessions.ShouldNotBeNull();
        _uow.Reviews.ShouldNotBeNull();
    }

    [Fact]
    public async Task SaveChangesAsync_ShouldPersistMultipleEntities()
    {
        var userId = Guid.NewGuid();
        var goalA = CreateGoal(userId, "Goal A");
        var goalB = CreateGoal(userId, "Goal B");

        await _uow.Goals.AddAsync(goalA);
        await _uow.Goals.AddAsync(goalB);
        await _uow.SaveChangesAsync();

        var all = await _uow.Goals.GetAllAsync();
        all.Count().ShouldBe(2);
    }

    [Fact]
    public async Task SaveChangesAsync_ShouldReturnRowCount()
    {
        await _uow.Goals.AddAsync(CreateGoal(Guid.NewGuid(), "Goal"));

        var rows = await _uow.SaveChangesAsync();

        rows.ShouldBe(1);
    }

    private static Goal CreateGoal(Guid userId, string title) => new()
    {
        Id = Guid.NewGuid(),
        UserId = userId,
        Year = 2026,
        Title = title,
        GoalType = GoalType.Project,
        Status = GoalStatus.Active,
        LifeArea = LifeArea.CareerWork,
        EnergyLevel = EnergyLevel.Medium,
        AlignedValueNames = "[]"
    };

    public void Dispose() => _uow.Dispose();
}
