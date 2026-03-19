namespace YearPlanningApp.Application.Common.Interfaces;

public interface IEmailService
{
    Task SendAsync(string toEmail, string toName, string subject, string htmlBody, CancellationToken ct = default);
    Task SendWithAttachmentAsync(string toEmail, string toName, string subject, string htmlBody, byte[] attachment, string attachmentFileName, CancellationToken ct = default);
}
