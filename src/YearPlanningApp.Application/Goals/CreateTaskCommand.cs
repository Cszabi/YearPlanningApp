using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Enums;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Goals;

public record CreateTaskCommand(
    Guid GoalId,
    Guid MilestoneId,
    int Year,
    string Title,
    EnergyLevel EnergyLevel,
    int? EstimatedMinutes,
    DateTime? DueDate,
    bool IsNextAction)
    : ICommand<OneOf<TaskDto, NotFoundError>>, IAuthenticatedCommand;

public class CreateTaskCommandHandler
    : ICommandHandler<CreateTaskCommand, OneOf<TaskDto, NotFoundError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public CreateTaskCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async ValueTask<OneOf<TaskDto, NotFoundError>> Handle(
        CreateTaskCommand command, CancellationToken ct)
    {
        var goal = await _uow.Goals.GetByIdAsync(command.GoalId, ct);
        if (goal is null || goal.UserId != _currentUser.UserId || goal.Year != command.Year)
            return new NotFoundError("Goal", command.GoalId);

        var milestone = await _uow.Tasks.GetByIdAsync(command.MilestoneId, ct);
        // milestone check via Milestones repo pattern — use context-level check
        var milestoneExists = goal.Milestones?.Any(m => m.Id == command.MilestoneId) ?? false;

        // Load milestones if not loaded
        var goals = await _uow.Goals.GetByUserAndYearAsync(_currentUser.UserId, command.Year, ct);
        var loadedGoal = goals.FirstOrDefault(g => g.Id == command.GoalId);
        if (loadedGoal is null)
            return new NotFoundError("Goal", command.GoalId);

        var targetMilestone = loadedGoal.Milestones.FirstOrDefault(m => m.Id == command.MilestoneId);
        if (targetMilestone is null)
            return new NotFoundError("Milestone", command.MilestoneId);

        var task = new TaskItem
        {
            GoalId = command.GoalId,
            MilestoneId = command.MilestoneId,
            Title = command.Title,
            Status = TaskItemStatus.NotStarted,
            EnergyLevel = command.EnergyLevel,
            EstimatedMinutes = command.EstimatedMinutes,
            DueDate = command.DueDate.HasValue
                ? DateTime.SpecifyKind(command.DueDate.Value, DateTimeKind.Utc)
                : null,
            IsNextAction = command.IsNextAction,
        };

        await _uow.Tasks.AddAsync(task, ct);
        await _uow.SaveChangesAsync(ct);

        return task.ToDto();
    }
}
