using Microsoft.EntityFrameworkCore;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Infrastructure.Persistence.Repositories;

public class UserRepository : BaseRepository<User>, IUserRepository
{
    public UserRepository(AppDbContext context) : base(context) { }

    public async Task<User?> GetByEmailAsync(string email, CancellationToken ct = default)
        => await _context.Users.FirstOrDefaultAsync(u => u.Email == email, ct);

    public async Task<User?> GetByRefreshTokenAsync(string hashedToken, CancellationToken ct = default)
        => await _context.Users.FirstOrDefaultAsync(u => u.RefreshToken == hashedToken, ct);

    public async Task<User?> GetByPasswordResetTokenHashAsync(string tokenHash, CancellationToken ct = default)
        => await _context.Users.FirstOrDefaultAsync(u => u.PasswordResetTokenHash == tokenHash, ct);

    public async Task<IReadOnlyList<User>> GetAllWithCountsAsync(CancellationToken ct = default)
        => await _context.Users
            .Include(u => u.Goals)
            .Include(u => u.FlowSessions)
            .ToListAsync(ct);

    public async Task<User?> GetWithDetailsAsync(Guid id, CancellationToken ct = default)
        => await _context.Users
            .Include(u => u.Goals)
            .Include(u => u.FlowSessions)
            .FirstOrDefaultAsync(u => u.Id == id, ct);
}
