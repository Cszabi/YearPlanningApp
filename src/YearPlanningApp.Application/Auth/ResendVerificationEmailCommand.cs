using System.Security.Cryptography;
using Mediator;
using Microsoft.Extensions.Logging;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Auth;

public record ResendVerificationEmailCommand() : ICommand<SuccessResult>, IAuthenticatedCommand;

public class ResendVerificationEmailCommandHandler
    : ICommandHandler<ResendVerificationEmailCommand, SuccessResult>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;
    private readonly IEmailService _emailService;
    private readonly IAppSettings _appSettings;
    private readonly ILogger<ResendVerificationEmailCommandHandler> _logger;

    public ResendVerificationEmailCommandHandler(
        IUnitOfWork uow,
        ICurrentUserService currentUser,
        IEmailService emailService,
        IAppSettings appSettings,
        ILogger<ResendVerificationEmailCommandHandler> logger)
    {
        _uow = uow;
        _currentUser = currentUser;
        _emailService = emailService;
        _appSettings = appSettings;
        _logger = logger;
    }

    public async ValueTask<SuccessResult> Handle(
        ResendVerificationEmailCommand command, CancellationToken ct)
    {
        var user = await _uow.Users.GetByIdAsync(_currentUser.UserId, ct);
        if (user is null || user.IsEmailVerified)
            return new SuccessResult(); // silently succeed — never reveal user existence

        // Generate a new token (invalidates any previous one)
        var tokenBytes = RandomNumberGenerator.GetBytes(32);
        var plainToken = Convert.ToHexString(tokenBytes).ToLowerInvariant();
        var tokenHash = Convert.ToHexString(
            SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(plainToken))
        ).ToLowerInvariant();

        user.EmailVerificationTokenHash = tokenHash;
        user.EmailVerificationTokenExpiresAt = DateTime.UtcNow.AddHours(24);

        _uow.Users.Update(user);
        await _uow.SaveChangesAsync(ct);

        var verifyUrl = $"{_appSettings.AppBaseUrl}/verify-email?token={plainToken}";
        _logger.LogInformation("Resent email verification link for {Email}: {VerifyUrl}", user.Email, verifyUrl);

        try
        {
            await _emailService.SendAsync(
                user.Email,
                user.DisplayName,
                "Verify your Flowkigai email",
                $"""
                <p>Hi {user.DisplayName},</p>
                <p>Here is a new link to verify your email address:</p>
                <p><a href="{verifyUrl}" style="display:inline-block;padding:12px 24px;background:#0D6E6E;color:white;text-decoration:none;border-radius:24px;font-size:14px;">Verify email</a></p>
                <p style="color:#6B7280;font-size:13px;">Or paste this link into your browser: {verifyUrl}</p>
                <p style="color:#6B7280;font-size:13px;">This link expires in 24 hours. If you did not request this email, you can safely ignore it.</p>
                <p style="color:#6B7280;font-size:13px;">— The Flowkigai team</p>
                """,
                ct
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to resend verification email to {Email}", user.Email);
        }

        return new SuccessResult();
    }
}
