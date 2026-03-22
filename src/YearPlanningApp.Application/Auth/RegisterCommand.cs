using System.Security.Cryptography;
using FluentValidation;
using Mediator;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
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
    private readonly IEmailService _emailService;
    private readonly IAppSettings _appSettings;
    private readonly ILogger<RegisterCommandHandler> _logger;

    public RegisterCommandHandler(
        IUnitOfWork uow,
        ITokenService tokenService,
        IPasswordHasher<User> hasher,
        IEmailService emailService,
        IAppSettings appSettings,
        ILogger<RegisterCommandHandler> logger)
    {
        _uow = uow;
        _tokenService = tokenService;
        _hasher = hasher;
        _emailService = emailService;
        _appSettings = appSettings;
        _logger = logger;
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
            IsEmailVerified = false,
        };
        user.PasswordHash = _hasher.HashPassword(user, command.Password);

        // Generate email verification token (32-byte random, stored as SHA256 hash)
        var tokenBytes = RandomNumberGenerator.GetBytes(32);
        var plainToken = Convert.ToHexString(tokenBytes).ToLowerInvariant();
        var tokenHash = Convert.ToHexString(
            SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(plainToken))
        ).ToLowerInvariant();

        user.EmailVerificationTokenHash = tokenHash;
        user.EmailVerificationTokenExpiresAt = DateTime.UtcNow.AddHours(24);

        var (accessToken, expiresAt) = _tokenService.GenerateAccessToken(user);
        var rawRefresh = _tokenService.GenerateRefreshToken();
        user.RefreshToken = _hasher.HashPassword(user, rawRefresh);
        user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(7);

        await _uow.Users.AddAsync(user, ct);
        await _uow.SaveChangesAsync(ct);

        var verifyUrl = $"{_appSettings.AppBaseUrl}/verify-email?token={plainToken}";
        _logger.LogInformation("Email verification link for {Email}: {VerifyUrl}", user.Email, verifyUrl);

        try
        {
            await _emailService.SendAsync(
                user.Email,
                user.DisplayName,
                "Verify your Flowkigai email",
                $"""
                <p>Hi {user.DisplayName},</p>
                <p>Welcome to Flowkigai! Please verify your email address by clicking the link below:</p>
                <p><a href="{verifyUrl}" style="display:inline-block;padding:12px 24px;background:#0D6E6E;color:white;text-decoration:none;border-radius:24px;font-size:14px;">Verify email</a></p>
                <p style="color:#6B7280;font-size:13px;">Or paste this link into your browser: {verifyUrl}</p>
                <p style="color:#6B7280;font-size:13px;">This link expires in 24 hours. If you did not create a Flowkigai account, you can safely ignore this email.</p>
                <p style="color:#6B7280;font-size:13px;">— The Flowkigai team</p>
                """,
                ct
            );
        }
        catch (Exception ex)
        {
            // Email delivery failure must not block registration — the token is saved and URL was logged.
            _logger.LogWarning(ex, "Failed to send verification email to {Email}", user.Email);
        }

        return new AuthResponse(user.Id, user.Email, user.DisplayName, accessToken, rawRefresh, expiresAt,
            user.CalendarProvider, user.Role.ToString(), user.Plan.ToString(), user.IsEmailVerified);
    }
}
