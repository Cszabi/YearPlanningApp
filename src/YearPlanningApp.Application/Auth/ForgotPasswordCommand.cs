using System.Security.Cryptography;
using FluentValidation;
using Mediator;
using Microsoft.Extensions.Logging;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Auth;

public record ForgotPasswordCommand(string Email) : ICommand<SuccessResult>;

public class ForgotPasswordCommandValidator : AbstractValidator<ForgotPasswordCommand>
{
    public ForgotPasswordCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
    }
}

public class ForgotPasswordCommandHandler : ICommandHandler<ForgotPasswordCommand, SuccessResult>
{
    private readonly IUnitOfWork _uow;
    private readonly IEmailService _emailService;
    private readonly IAppSettings _appSettings;
    private readonly ILogger<ForgotPasswordCommandHandler> _logger;

    public ForgotPasswordCommandHandler(
        IUnitOfWork uow,
        IEmailService emailService,
        IAppSettings appSettings,
        ILogger<ForgotPasswordCommandHandler> logger)
    {
        _uow = uow;
        _emailService = emailService;
        _appSettings = appSettings;
        _logger = logger;
    }

    public async ValueTask<SuccessResult> Handle(ForgotPasswordCommand command, CancellationToken ct)
    {
        var user = await _uow.Users.GetByEmailAsync(command.Email.ToLowerInvariant(), ct);

        // Always return success — never reveal whether the email exists
        if (user is null)
            return new SuccessResult();

        // Generate a 32-byte cryptographically random token
        var tokenBytes = RandomNumberGenerator.GetBytes(32);
        var plainToken = Convert.ToHexString(tokenBytes).ToLowerInvariant();

        // Hash it before storing
        var tokenHash = Convert.ToHexString(
            SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(plainToken))
        ).ToLowerInvariant();

        user.PasswordResetTokenHash = tokenHash;
        user.PasswordResetTokenExpiresAt = DateTime.UtcNow.AddHours(1);

        _uow.Users.Update(user);
        await _uow.SaveChangesAsync(ct);

        var resetUrl = $"{_appSettings.AppBaseUrl}/reset-password?token={plainToken}";

        // Log the URL so it's visible in dev even when SMTP isn't configured
        _logger.LogInformation("Password reset link for {Email}: {ResetUrl}", user.Email, resetUrl);

        try
        {
            await _emailService.SendAsync(
                user.Email,
                user.DisplayName,
                "Reset your Flowkigai password",
                $"""
                <p>Hi {user.DisplayName},</p>
                <p>We received a request to reset your password. Click the link below to set a new password:</p>
                <p><a href="{resetUrl}">{resetUrl}</a></p>
                <p>This link expires in 1 hour. If you did not request a password reset, you can ignore this email.</p>
                <p>— The Flowkigai team</p>
                """,
                ct
            );
        }
        catch (Exception ex)
        {
            // Email delivery failure must not expose errors to the caller —
            // the token is already saved and the reset link was logged above.
            _logger.LogWarning(ex, "Failed to send password reset email to {Email}", user.Email);
        }

        return new SuccessResult();
    }
}
