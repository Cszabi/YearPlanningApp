namespace YearPlanningApp.Application.Auth;

public record AuthResponse(
    Guid UserId,
    string Email,
    string DisplayName,
    string AccessToken,
    string RefreshToken,
    DateTime AccessTokenExpiresAt,
    string? CalendarProvider);
