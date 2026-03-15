using Microsoft.EntityFrameworkCore;
using Shouldly;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Infrastructure.Persistence;
using YearPlanningApp.Infrastructure.Persistence.Repositories;

namespace YearPlanningApp.Application.Tests.Persistence;

public class BaseRepositoryTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly GoalRepository _repository;

    public BaseRepositoryTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _repository = new GoalRepository(_context);
    }

    [Fact]
    public async Task AddAsync_ShouldPersistEntity()
    {
        var goal = CreateGoal();

        await _repository.AddAsync(goal);
        await _context.SaveChangesAsync();

        var saved = await _repository.GetByIdAsync(goal.Id);
        saved.ShouldNotBeNull();
        saved.Title.ShouldBe("Test Goal");
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnNull_WhenNotFound()
    {
        var result = await _repository.GetByIdAsync(Guid.NewGuid());

        result.ShouldBeNull();
    }

    [Fact]
    public async Task GetAllAsync_ShouldReturnAllEntities()
    {
        await _repository.AddAsync(CreateGoal("Goal A"));
        await _repository.AddAsync(CreateGoal("Goal B"));
        await _context.SaveChangesAsync();

        var all = await _repository.GetAllAsync();

        all.Count().ShouldBe(2);
    }

    [Fact]
    public async Task Update_ShouldModifyEntity()
    {
        var goal = CreateGoal();
        await _repository.AddAsync(goal);
        await _context.SaveChangesAsync();

        goal.Title = "Updated Title";
        _repository.Update(goal);
        await _context.SaveChangesAsync();

        var updated = await _repository.GetByIdAsync(goal.Id);
        updated!.Title.ShouldBe("Updated Title");
    }

    [Fact]
    public async Task Remove_ShouldSoftDeleteEntity()
    {
        var goal = CreateGoal();
        await _repository.AddAsync(goal);
        await _context.SaveChangesAsync();

        _repository.Remove(goal);
        await _context.SaveChangesAsync();

        // Soft delete: entity still in DB but query filter hides it
        var result = await _repository.GetByIdAsync(goal.Id);
        result.ShouldBeNull();

        // Verify DeletedAt was set
        var raw = await _context.Goals.IgnoreQueryFilters().FirstOrDefaultAsync(g => g.Id == goal.Id);
        raw.ShouldNotBeNull();
        raw!.DeletedAt.ShouldNotBeNull();
        raw.IsDeleted.ShouldBeTrue();
    }

    [Fact]
    public async Task GetAllAsync_ShouldNotReturn_SoftDeletedEntities()
    {
        var activeGoal = CreateGoal("Active");
        var deletedGoal = CreateGoal("Deleted");
        await _repository.AddAsync(activeGoal);
        await _repository.AddAsync(deletedGoal);
        await _context.SaveChangesAsync();

        _repository.Remove(deletedGoal);
        await _context.SaveChangesAsync();

        var all = await _repository.GetAllAsync();

        all.Count().ShouldBe(1);
        all.First().Title.ShouldBe("Active");
    }

    private static Goal CreateGoal(string title = "Test Goal") => new()
    {
        Id = Guid.NewGuid(),
        UserId = Guid.NewGuid(),
        Year = 2026,
        Title = title,
        GoalType = GoalType.Project,
        Status = GoalStatus.Active,
        LifeArea = LifeArea.CareerWork,
        EnergyLevel = EnergyLevel.Deep,
        AlignedValueNames = "[]"
    };

    public void Dispose() => _context.Dispose();
}
