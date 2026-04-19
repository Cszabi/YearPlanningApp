using FluentValidation;
using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Admin;

public record SendAnnouncementCommand(string Subject, string HtmlBody, DateOnly SinceDate)
    : ICommand<OneOf<SendAnnouncementResult, ValidationError>>;

public record SendAnnouncementResult(int SentCount);

public class SendAnnouncementCommandValidator : AbstractValidator<SendAnnouncementCommand>
{
    public SendAnnouncementCommandValidator()
    {
        RuleFor(x => x.Subject).NotEmpty().MaximumLength(200);
        RuleFor(x => x.HtmlBody).NotEmpty();
        RuleFor(x => x.SinceDate).NotEqual(default(DateOnly));
    }
}

public class SendAnnouncementCommandHandler(IUnitOfWork uow, IEmailService email)
    : ICommandHandler<SendAnnouncementCommand, OneOf<SendAnnouncementResult, ValidationError>>
{
    public async ValueTask<OneOf<SendAnnouncementResult, ValidationError>> Handle(
        SendAnnouncementCommand cmd, CancellationToken ct)
    {
        var cutoff = cmd.SinceDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        var users = await uow.Users.GetAllWithCountsAsync(ct);
        var recipients = users
            .Where(u => u.DeletedAt == null && u.CreatedAt < cutoff)
            .ToList();

        var sentCount = 0;
        foreach (var u in recipients)
        {
            try
            {
                await email.SendAsync(u.Email, u.DisplayName, cmd.Subject, cmd.HtmlBody, ct);
                sentCount++;
            }
            catch (Exception) { /* skip undeliverable recipients */ }
        }

        return new SendAnnouncementResult(sentCount);
    }
}
