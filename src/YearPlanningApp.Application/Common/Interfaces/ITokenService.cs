using YearPlanningApp.Domain.Entities;

namespace YearPlanningApp.Application.Common.Interfaces;

public interface ITokenService
{
    (string token, DateTime expiresAt) GenerateAccessToken(User user);
    string GenerateRefreshToken();
}
