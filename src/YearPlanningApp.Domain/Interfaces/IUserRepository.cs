using YearPlanningApp.Domain.Entities;

namespace YearPlanningApp.Domain.Interfaces;

public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<User?> GetByRefreshTokenAsync(string hashedToken, CancellationToken ct = default);
    Task<User?> GetByEmailVerificationTokenHashAsync(string tokenHash, CancellationToken ct = default);
    Task<User?> GetByPasswordResetTokenHashAsync(string tokenHash, CancellationToken ct = default);
    Task<IReadOnlyList<User>> GetAllWithCountsAsync(CancellationToken ct = default);
    Task<User?> GetWithDetailsAsync(Guid id, CancellationToken ct = default);
}
