using System.Net;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WebPush;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Domain.Interfaces;
using YearPlanningApp.Infrastructure.Settings;

namespace YearPlanningApp.Infrastructure.Services;

public class PushNotificationService : IPushNotificationService
{
    private readonly VapidDetails _vapidDetails;
    private readonly IUnitOfWork _uow;
    private readonly ILogger<PushNotificationService> _logger;

    public PushNotificationService(
        IOptions<VapidSettings> vapidOptions,
        IUnitOfWork uow,
        ILogger<PushNotificationService> logger)
    {
        var settings = vapidOptions.Value;
        _vapidDetails = new VapidDetails(settings.Subject, settings.PublicKey, settings.PrivateKey);
        _uow = uow;
        _logger = logger;
    }

    public async Task SendAsync(Guid userId, string title, string body, string url, CancellationToken ct = default)
    {
        var subscriptions = await _uow.PushSubscriptions.GetActiveByUserIdAsync(userId, ct);
        var webPushClient = new WebPushClient();
        var payload = System.Text.Json.JsonSerializer.Serialize(new
        {
            title,
            body,
            icon = "/icons/icon-192.png",
            url,
        });

        foreach (var sub in subscriptions)
        {
            try
            {
                var pushSubscription = new WebPush.PushSubscription(sub.Endpoint, sub.P256dh, sub.Auth);
                await webPushClient.SendNotificationAsync(pushSubscription, payload, _vapidDetails);
            }
            catch (WebPushException ex) when (ex.StatusCode == HttpStatusCode.Gone)
            {
                _logger.LogInformation("Push subscription gone for endpoint {Endpoint}, deactivating", sub.Endpoint);
                await _uow.PushSubscriptions.DeactivateAsync(sub.Endpoint, ct);
                await _uow.SaveChangesAsync(ct);
            }
            catch (WebPushException ex) when (ex.StatusCode == HttpStatusCode.TooManyRequests)
            {
                _logger.LogWarning("Push notification rate-limited for user {UserId}", userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send push notification to {Endpoint} for user {UserId}", sub.Endpoint, userId);
            }
        }
    }
}
