using Microsoft.EntityFrameworkCore;
using Shouldly;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Infrastructure.Persistence;
using YearPlanningApp.Infrastructure.Persistence.Repositories;

namespace YearPlanningApp.Application.Tests.Goals;

public class GoalProgressTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly GoalRepository _repo;

    public GoalProgressTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _repo = new GoalRepository(_context);
    }

    public void Dispose() => _context.Dispose();

    [Fact]
    public async Task CalculateGoalProgress_ShouldReturn0_WhenNoTasks()
    {
        var goal = CreateGoalWithTasks([]);
        _context.Goals.Add(goal);
        await _context.SaveChangesAsync();

        var progress = await _repo.CalculateGoalProgressAsync(goal.Id);

        progress.ShouldBe(0);
    }

    [Fact]
    public async Task CalculateGoalProgress_ShouldReturn100_WhenAllTasksDone()
    {
        var goal = CreateGoalWithTasks([TaskItemStatus.Done, TaskItemStatus.Done, TaskItemStatus.Done]);
        _context.Goals.Add(goal);
        await _context.SaveChangesAsync();

        var progress = await _repo.CalculateGoalProgressAsync(goal.Id);

        progress.ShouldBe(100);
    }

    [Fact]
    public async Task CalculateGoalProgress_ShouldReturn50_WhenHalfDone()
    {
        var goal = CreateGoalWithTasks([TaskItemStatus.Done, TaskItemStatus.NotStarted,
                                        TaskItemStatus.Done, TaskItemStatus.InProgress]);
        _context.Goals.Add(goal);
        await _context.SaveChangesAsync();

        var progress = await _repo.CalculateGoalProgressAsync(goal.Id);

        progress.ShouldBe(50);
    }

    [Fact]
    public async Task CalculateGoalProgress_ShouldRound_WhenNotExactPercentage()
    {
        var goal = CreateGoalWithTasks([TaskItemStatus.Done, TaskItemStatus.NotStarted, TaskItemStatus.NotStarted]);
        _context.Goals.Add(goal);
        await _context.SaveChangesAsync();

        var progress = await _repo.CalculateGoalProgressAsync(goal.Id);

        progress.ShouldBe(33); // Math.Round(1/3 * 100)
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private static Goal CreateGoalWithTasks(IEnumerable<TaskItemStatus> statuses)
    {
        var goalId = Guid.NewGuid();
        var milestoneId = Guid.NewGuid();

        var goal = new Goal
        {
            Id = goalId,
            UserId = Guid.NewGuid(),
            Year = 2026,
            Title = "Test goal",
            GoalType = GoalType.Project,
            Status = GoalStatus.Active,
            LifeArea = LifeArea.CareerWork,
            EnergyLevel = EnergyLevel.Medium,
        };

        var milestone = new Milestone
        {
            Id = milestoneId,
            GoalId = goalId,
            Title = "Phase 1",
            OrderIndex = 0,
        };

        var tasks = statuses.Select((status, i) => new TaskItem
        {
            GoalId = goalId,
            MilestoneId = milestoneId,
            Title = $"Task {i + 1}",
            Status = status,
            EnergyLevel = EnergyLevel.Medium,
        }).ToList();

        goal.Milestones.Add(milestone);
        milestone.Tasks = tasks;

        return goal;
    }
}
