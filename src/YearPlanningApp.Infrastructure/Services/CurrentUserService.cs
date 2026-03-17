using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using YearPlanningApp.Application.Common.Interfaces;

namespace YearPlanningApp.Infrastructure.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid UserId
    {
        get
        {
            var claim = _httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
            return claim is not null ? Guid.Parse(claim) : Guid.Empty;
        }
    }

    public string Email
        => _httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.Email) ?? string.Empty;

    public bool IsAuthenticated
        => _httpContextAccessor.HttpContext?.User.Identity?.IsAuthenticated ?? false;

    public bool IsAdmin
        => _httpContextAccessor.HttpContext?.User.FindFirstValue("role") == "Admin";

    public string Plan
        => _httpContextAccessor.HttpContext?.User.FindFirstValue("plan") ?? "Free";
}
