using FluentValidation;
using Mediator;
using Microsoft.AspNetCore.Identity;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Auth;

public record RegisterCommand(string Email, string DisplayName, string Password, string? CalendarProvider)
    : ICommand<OneOf<AuthResponse, ValidationError, ConflictError>>;

public class RegisterCommandValidator : AbstractValidator<RegisterCommand>
{
    public RegisterCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.DisplayName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8).MaximumLength(128);
    }
}

public class RegisterCommandHandler
    : ICommandHandler<RegisterCommand, OneOf<AuthResponse, ValidationError, ConflictError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ITokenService _tokenService;
    private readonly IPasswordHasher<User> _hasher;

    public RegisterCommandHandler(IUnitOfWork uow, ITokenService tokenService, IPasswordHasher<User> hasher)
    {
        _uow = uow;
        _tokenService = tokenService;
        _hasher = hasher;
    }

    public async ValueTask<OneOf<AuthResponse, ValidationError, ConflictError>> Handle(
        RegisterCommand command, CancellationToken ct)
    {
        var existing = await _uow.Users.GetByEmailAsync(command.Email.ToLowerInvariant(), ct);
        if (existing is not null)
            return new ConflictError("An account with this email already exists.");

        var user = new User
        {
            Email = command.Email.ToLowerInvariant(),
            DisplayName = command.DisplayName,
            CalendarProvider = command.CalendarProvider,
        };
        user.PasswordHash = _hasher.HashPassword(user, command.Password);

        var (accessToken, expiresAt) = _tokenService.GenerateAccessToken(user);
        var rawRefresh = _tokenService.GenerateRefreshToken();
        user.RefreshToken = _hasher.HashPassword(user, rawRefresh);
        user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(7);

        await _uow.Users.AddAsync(user, ct);
        await _uow.SaveChangesAsync(ct);

        return new AuthResponse(user.Id, user.Email, user.DisplayName, accessToken, rawRefresh, expiresAt, user.CalendarProvider);
    }
}
