namespace YearPlanningApp.Application.Common.Interfaces;

public interface IPushNotificationService
{
    Task SendAsync(Guid userId, string title, string body, string url, CancellationToken ct = default);
}
