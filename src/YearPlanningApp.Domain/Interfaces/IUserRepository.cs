using YearPlanningApp.Domain.Entities;

namespace YearPlanningApp.Domain.Interfaces;

public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<User?> GetByRefreshTokenAsync(string hashedToken, CancellationToken ct = default);
}
